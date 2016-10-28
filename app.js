
var socketclass =  require('./socketclass');
socketserver= new socketclass();
socketserver.listen({host:'localhost', port:3200});
