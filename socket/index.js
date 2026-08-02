const jwt = require('jsonwebtoken');
const Table = require('../game/Table');
const Player = require('../game/Player');
const {
  CS_FETCH_LOBBY_INFO,
  SC_RECEIVE_LOBBY_INFO,
  SC_PLAYERS_UPDATED,
  CS_JOIN_TABLE,
  SC_TABLE_JOINED,
  SC_TABLES_UPDATED,
  CS_LEAVE_TABLE,
  SC_TABLE_LEFT,
  CS_FOLD,
  CS_CHECK,
  CS_CALL,
  CS_RAISE,
  TABLE_MESSAGE,
  CS_SIT_DOWN,
  CS_REBUY,
  CS_STAND_UP,
  SITTING_OUT,
  SITTING_IN,
  CS_DISCONNECT,
  SC_TABLE_UPDATED,
  WINNER,
  CS_LOBBY_CONNECT,
  CS_LOBBY_DISCONNECT,
  SC_LOBBY_CONNECTED,
  SC_LOBBY_DISCONNECTED,
  SC_LOBBY_CHAT,
  CS_LOBBY_CHAT,
} = require('../game/actions');
const config = require('../config');

const tables = {
  1: new Table(1, 'Table 1', config.INITIAL_CHIPS_AMOUNT),
};
const players = {};

function getCurrentPlayers() {
  return Object.values(players).map((player) => ({
    socketId: player.socketId,
    id: player.id,
    name: player.name,
  }));
}

function getCurrentTables() {
  return Object.values(tables).map((table) => ({
    id: table.id,
    name: table.name,
    limit: table.limit,
    maxPlayers: table.maxPlayers,
    currentNumberPlayers: table.players.length,
    smallBlind: table.minBet,
    bigBlind: table.minBet * 2,
  }));
}

// Helper to find the first open seat slot between 1 and maxPlayers
function getFirstEmptySeat(table) {
  const maxSeats = table.maxPlayers || 5;
  for (let i = 1; i <= maxSeats; i++) {
    const seat = table.seats[i];
    if (!seat || !seat.player) {
      return i;
    }
  }
  return null;
}

const init = (socket, io) => {
  socket.on(CS_LOBBY_CONNECT, ({gameId, address, userInfo }) => {
    socket.join(gameId);
    io.to(gameId).emit(SC_LOBBY_CONNECTED, {address, userInfo});
  });
  
  socket.on(CS_LOBBY_DISCONNECT, ({gameId, address, userInfo}) => {
    io.to(gameId).emit(SC_LOBBY_DISCONNECTED, {address, userInfo});
  });

  socket.on(CS_LOBBY_CHAT, ({ gameId, text, userInfo }) => {
    io.to(gameId).emit(SC_LOBBY_CHAT, {text, userInfo});
  });

  socket.on(CS_FETCH_LOBBY_INFO, ({walletAddress, socketId, gameId, username}) => {
    const found = Object.values(players).find((player) => player.id == walletAddress);

    if (found) {
      delete players[found.socketId];
      Object.values(tables).forEach((table) => {
        table.removePlayer(found.socketId);
        broadcastToTable(table);
      });
    }

    players[socketId] = new Player(
      socketId,
      walletAddress,
      username || 'Player',
      config.INITIAL_CHIPS_AMOUNT,
    );
    socket.emit(SC_RECEIVE_LOBBY_INFO, {
      tables: getCurrentTables(),
      players: getCurrentPlayers(),
      socketId: socket.id,
      amount: config.INITIAL_CHIPS_AMOUNT
    });
    socket.broadcast.emit(SC_PLAYERS_UPDATED, getCurrentPlayers());
  });

  socket.on(CS_JOIN_TABLE, (payload) => {
    const rawTableId = (typeof payload === 'object' && payload !== null) ? payload.tableId : payload;
    const table = tables[rawTableId] || tables[String(rawTableId)] || tables[Number(rawTableId)];
    
    if (!table) {
      socket.emit('error', { message: 'Table not found' });
      return;
    }

    // 1. Resolve Player Username cleanly
    let incomingName = 'Player';
    if (payload && typeof payload === 'object' && (payload.name || payload.username)) {
      incomingName = payload.name || payload.username;
    }

    // 2. Initialize or Update Player Session
    if (!players[socket.id]) {
      players[socket.id] = new Player(
        socket.id,
        (payload && payload.address) || `wallet-${socket.id.substring(0, 5)}`,
        incomingName,
        config.INITIAL_CHIPS_AMOUNT
      );
    } else if (incomingName && incomingName !== 'Player') {
      players[socket.id].name = incomingName;
    }

    const player = players[socket.id];

    // 3. Clear dead/unassigned ghost seats
    for (let seatId = 1; seatId <= table.maxPlayers; seatId++) {
      const s = table.seats[seatId];
      if (s && s.player && !players[s.player.socketId]) {
        table.seats[seatId] = null;
      }
    }

    // 4. Check if current socket or wallet is already seated
    const existingSeat = Object.values(table.seats).find(
      (seat) => seat && seat.player && (
        seat.player.socketId === socket.id ||
        (player && seat.player.id === player.id)
      )
    );

    table.addPlayer(player);
    socket.emit(SC_TABLE_JOINED, { tables: getCurrentTables(), tableId: rawTableId });
    socket.broadcast.emit(SC_TABLES_UPDATED, getCurrentTables());
    
    const resolvedTableKey = tables[rawTableId] ? rawTableId : (tables[String(rawTableId)] ? String(rawTableId) : Number(rawTableId));
    
    // 5. Automatically Sit Down in Seat 1 (or first available) if not seated
    if (!existingSeat) {
      const emptySeat = getFirstEmptySeat(table);
      if (emptySeat) {
        sitDown(resolvedTableKey, emptySeat, config.INITIAL_CHIPS_AMOUNT);
      }
    } else {
      broadcastToTable(table);
    }

    if (table.players && table.players.length > 0) {
      let message = `${player.name} joined the table.`;
      broadcastToTable(table, message);
    }
  });

  socket.on(CS_LEAVE_TABLE, (tableId) => {
    const table = tables[tableId] || tables[String(tableId)] || tables[Number(tableId)];
    if (!table) return;

    const player = players[socket.id];
    const seat = Object.values(table.seats).find(
      (seat) => seat && seat.player && seat.player.socketId === socket.id,
    );

    if (seat && player) {
      updatePlayerBankroll(player, seat.stack);
    }

    table.removePlayer(socket.id);

    socket.broadcast.emit(SC_TABLES_UPDATED, getCurrentTables());
    socket.emit(SC_TABLE_LEFT, { tables: getCurrentTables(), tableId });

    if (table.players && table.players.length > 0 && player) {
      let message = `${player.name} left the table.`;
      broadcastToTable(table, message);
    }

    if (table.activePlayers().length === 1) {
      clearForOnePlayer(table);
    }
  });

  socket.on(CS_FOLD, (tableId) => {
    let table = tables[tableId] || tables[String(tableId)] || tables[Number(tableId)];
    if (!table) return;
    let res = table.handleFold(socket.id);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(CS_CHECK, (tableId) => {
    let table = tables[tableId] || tables[String(tableId)] || tables[Number(tableId)];
    if (!table) return;
    let res = table.handleCheck(socket.id);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(CS_CALL, (tableId) => {
    let table = tables[tableId] || tables[String(tableId)] || tables[Number(tableId)];
    if (!table) return;
    let res = table.handleCall(socket.id);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(CS_RAISE, ({ tableId, amount }) => {
    let table = tables[tableId] || tables[String(tableId)] || tables[Number(tableId)];
    if (!table) return;
    let res = table.handleRaise(socket.id, amount);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(TABLE_MESSAGE, ({ message, from, tableId }) => {
    let table = tables[tableId] || tables[String(tableId)] || tables[Number(tableId)];
    if (!table) return;
    broadcastToTable(table, message, from);
  });

  socket.on(CS_SIT_DOWN, ({ tableId, seatId, amount }) => {
    const resolvedSeat = seatId || 1;
    const resolvedAmount = amount || config.INITIAL_CHIPS_AMOUNT;
    sitDown(tableId, resolvedSeat, resolvedAmount);
  });

  const sitDown = (tableId, seatId, amount) => {
    const table = tables[tableId] || tables[String(tableId)] || tables[Number(tableId)];
    if (!table) return;
    const player = players[socket.id];
    if (player) {
      table.sitPlayer(player, seatId, amount);

      if (table.seats && table.seats[seatId]) {
        table.seats[seatId].name = player.name;
        table.seats[seatId].playerName = player.name;
        if (table.seats[seatId].player) {
          table.seats[seatId].player.name = player.name;
        }
      }

      let message = `${player.name} sat down in Seat ${seatId}`;
      updatePlayerBankroll(player, -amount);
      broadcastToTable(table, message);
      
      if (table.activePlayers().length === 2) {
        initNewHand(table);
      }
    }
  };

  socket.on(CS_REBUY, ({ tableId, seatId, amount }) => {
    const table = tables[tableId] || tables[String(tableId)] || tables[Number(tableId)];
    if (!table) return;
    const player = players[socket.id];

    table.rebuyPlayer(seatId, amount);
    updatePlayerBankroll(player, -amount);
    broadcastToTable(table);
  });

  socket.on(CS_STAND_UP, (tableId) => {
    const table = tables[tableId] || tables[String(tableId)] || tables[Number(tableId)];
    if (!table) return;
    const player = players[socket.id];
    const seat = Object.values(table.seats).find(
      (seat) => seat && seat.player && seat.player.socketId === socket.id,
    );

    let message = '';
    if (seat && player) {
      updatePlayerBankroll(player, seat.stack);
      message = `${player.name} left the table`;
    }

    table.standPlayer(socket.id);
    broadcastToTable(table, message);
    if (table.activePlayers().length === 1) {
      clearForOnePlayer(table);
    }
  });

  socket.on(SITTING_OUT, ({ tableId, seatId }) => {
    const table = tables[tableId] || tables[String(tableId)] || tables[Number(tableId)];
    if (!table) return;
    const seat = table.seats[seatId];
    if (seat) {
      seat.sittingOut = true;
      broadcastToTable(table);
    }
  });

  socket.on(SITTING_IN, ({ tableId, seatId }) => {
    const table = tables[tableId] || tables[String(tableId)] || tables[Number(tableId)];
    if (!table) return;
    const seat = table.seats[seatId];
    if (seat) {
      seat.sittingOut = false;
      broadcastToTable(table);
      if (table.handOver && table.activePlayers().length === 2) {
        initNewHand(table);
      }
    }
  });

  socket.on(CS_DISCONNECT, () => {
    const seat = findSeatBySocketId(socket.id);
    if (seat && seat.player) {
      updatePlayerBankroll(seat.player, seat.stack);
    }

    delete players[socket.id];
    removeFromTables(socket.id);

    socket.broadcast.emit(SC_TABLES_UPDATED, getCurrentTables());
    socket.broadcast.emit(SC_PLAYERS_UPDATED, getCurrentPlayers());
  });

  async function updatePlayerBankroll(player, amount) {
    if (players[socket.id]) {
      players[socket.id].bankroll += amount;
      io.to(socket.id).emit(SC_PLAYERS_UPDATED, getCurrentPlayers());
    }
  }

  function findSeatBySocketId(socketId) {
    let foundSeat = null;
    Object.values(tables).forEach((table) => {
      Object.values(table.seats).forEach((seat) => {
        if (seat && seat.player && seat.player.socketId === socketId) {
          foundSeat = seat;
        }
      });
    });
    return foundSeat;
  }
 
  function removeFromTables(socketId) {
    for (let i = 0; i < Object.keys(tables).length; i++) {
      tables[Object.keys(tables)[i]].removePlayer(socketId);
    }
  }

  function broadcastToTable(table, message = null, from = null) {
    for (let i = 0; i < table.players.length; i++) {
      let socketId = table.players[i].socketId;
      let tableCopy = hideOpponentCards(table, socketId);
      io.to(socketId).emit(SC_TABLE_UPDATED, {
        table: tableCopy,
        message,
        from,
      });
    }
  }

  function changeTurnAndBroadcast(table, seatId) {
    setTimeout(() => {
      table.changeTurn(seatId);
      broadcastToTable(table);

      if (table.handOver) {
        initNewHand(table);
      }
    }, 1000);
  }

  function initNewHand(table) {
    if (table.activePlayers().length > 1) {
      broadcastToTable(table, '---New hand starting in 5 seconds---');
    }
    setTimeout(() => {
      table.clearWinMessages();
      table.startHand();
      broadcastToTable(table, '--- New hand started ---');
    }, 5000);
  }

  function clearForOnePlayer(table) {
    table.clearWinMessages();
    setTimeout(() => {
      table.clearSeatHands();
      table.resetBoardAndPot();
      broadcastToTable(table, 'Waiting for more players');
    }, 5000);
  }

  function hideOpponentCards(table, socketId) {
    let tableCopy = JSON.parse(JSON.stringify(table));
    let hiddenCard = { suit: 'hidden', rank: 'hidden' };
    let hiddenHand = [hiddenCard, hiddenCard];

    for (let i = 1; i <= tableCopy.maxPlayers; i++) {
      let seat = tableCopy.seats[i];
      if (
        seat &&
        seat.hand &&
        seat.hand.length > 0 &&
        seat.player &&
        seat.player.socketId !== socketId &&
        !(seat.lastAction === WINNER && tableCopy.wentToShowdown)
      ) {
        seat.hand = hiddenHand;
      }
    }
    return tableCopy;
  }
};

module.exports = { init };
