const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const url = "mongodb://localhost:27017/users";

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get('/', function(req, res){
	res.sendFile(__dirname + '/users.html');
});

io.on('connection', function(socket){
	let users;
  
	socket.on('some event', function(msg){
		mongoConnect();
	});

	socket.on('user message', function(msg){
		mongoConnect(msg);
	});
	
	socket.on('user search', function(msg){
		msg.search=1;
		mongoConnect(msg);
	});

	socket.on('user remove', function(msg){
		msg.remove=1;
		mongoConnect(msg);
	});
});

function mongoConnect(query) {
	let result = {};
	mongoClient.connect(url, function(err, db){
		if (err) {
			console.log("Не удается подключиться к БД");
			result.err = 'Не удается подключиться к БД';
		}
		else {
			console.log("Соединение с БД установленно");
			let collection = db.collection("contacts");
			if (query == undefined) {
				collection.find(function(err, cursor) {
				  cursor.toArray(function(err, items) {
						io.emit('some event', items);
				  });
				});
			}
			else if (query.id!='' && query.search!=1) {
				if (query.remove == 1) {
					collection.remove({_id:  new mongodb.ObjectID(query.id)}, function(err, res){
						if(err){ 
							result.err = err;
						}
						io.emit('user remove', query);
					});
				}
				else {
					collection.update({_id:query.id},{"$set":{name:query.name, phone:query.phone}}, function(err, res){
						if(err){ 
							result.err = err;
						}
						query._id=query.id;
						io.emit('user message', query);
					});
				}
			}
			else if (query.search == 1) {
				collection.find({name: {$regex: /query.name/i}, phone:{$regex: /query.phone/i}}, function(err, cursor) {
				  cursor.toArray(function(err, items) {
						io.emit('some event', items);
				  });
				});
			}
			else {
				collection.insertOne(query, function(err, res){
					if(err){ 
						result.err = err;
					}
					io.emit('user message', res.ops[0]);
				});
			}
		}
		db.close();
	});
}

http.listen(3000, function(){
  console.log('Start server');
});