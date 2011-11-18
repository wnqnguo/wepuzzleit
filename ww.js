var ww_socket = "http://xx.yy.zz.ww:80";

importScripts(ww_socket+"/socket.io/socket.io.js");

var socket,
	socket_initialized = false,
	game_session_started = false,
	real_tile_ids = {},
	dom_tile_ids = {}
;

function new_tile_id() {
	var id;
	do {
		id = Math.round(Math.random() * 1E9);
	} while (typeof real_tile_ids[id] != "undefined");
	real_tile_ids[id] = true;
	return id;
}


function initializeGameSession(game_session_id) {
	if (!socket) {
		socket = io.connect(ww_socket+"/ww");
	}
	
	if (!socket_initialized) {
		socket_initialized = true;
		
		socket.on("game_session_valid", function(data) {
			var i, id, new_tiles = {};
			
			for (i in data.tiles) {
				id = new_tile_id();
				real_tile_ids[id] = i;
				dom_tile_ids[i] = id;
				new_tiles[id] = data.tiles[i];
			}
			
			data.tiles = new_tiles;
												 
			self.postMessage({preview:data.preview});
			self.postMessage({tiles:data.tiles,rows:data.rows,cols:data.cols,tile_size:data.tile_size});
			
			// have we joined a finished/frozen game?
			if (!data.in_play) {
				setTimeout(function(){
					self.postMessage({freeze_game:true});
				},100);
			}
		});
		
		socket.on("position_tile", function(data) {
			self.postMessage({position_tile:true,tile_id:dom_tile_ids[data.tile_id],position:data.position});
		});
		
		socket.on("move_tile", function(data) {
			self.postMessage({move_tile:true,tile_id:dom_tile_ids[data.tile_id],x:data.x,y:data.y});
		});
		
		socket.on("reset_tile",function(data) {
			self.postMessage({reset_tile:true,tile_id:dom_tile_ids[data.tile_id]});
		});
		
		socket.on("game_session_invalid", function(data) {
			self.postMessage({error:"game_session_invalid"});
		});
	}
	
	if (!game_session_started) {
		game_session_started = true;
		socket.emit("establish_game_session", {game_session_id:game_session_id} );
	}
}

function take_tile(tile_id) {
	socket.emit("take_tile",{tile_id:real_tile_ids[tile_id]},function(ok){
		if (ok) {
			self.postMessage({tile_drag_ok:true});
		}
		else {
			self.postMessage({tile_drag_invalid:true});
		}
	});
}

function move_tile(tile_id,x,y) {
	socket.emit("move_tile",{tile_id:real_tile_ids[tile_id],x:x,y:y});
}

function try_tile_position(tile_id,position) {
	socket.emit("try_tile_position",{tile_id:real_tile_ids[tile_id],position:position});
}

self.onmessage = function(evt) {
	switch (evt.data.messageType) {
		case "start":
			initializeGameSession(evt.data.game_session_id);
			break;
		case "take_tile":
			take_tile(evt.data.tile_id);
			break;
		case "move_tile":
			move_tile(evt.data.tile_id,evt.data.x,evt.data.y);
			break;
		case "try_tile_position":
			try_tile_position(evt.data.tile_id,evt.data.position);
			break;
	}
};