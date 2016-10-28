var net = require('net');
var socketclass = function(){
	
	
    this.databuffer = [];
    this.contentType = 'T';
    this.chunks = false;
    this.continuouschunk = false;
    var server = net.createServer((socket)=>{
        this.socket = socket
       
        socket.on('data', (data)=>{this.ondata(data);});
        socket.on('end', ()=>{this.onend()});
        socket.on('connect',()=>{this.onconnect();});
        socket.on('error',(err)=>{this.onerror(err);});
        socket.on('close', ()=>{this.onclose();});
    });
    return server;
}

   
   socketclass.prototype.ondata = function (data)
	{
		//crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex')
		
		
		var dataObj =  data.toString('utf8');
		
		var matches = dataObj.match(new RegExp(/Sec-WebSocket-Key: (.*)/));
		
		if(matches != null)
		{
			var endOfLine = require('os').EOL;
			 var trmd = matches[1].trim();
             
			  var crypto =require('crypto');
			var crypt = crypto.createHash('sha1').update(trmd+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
			//console.log(crypt);
			var respns = 'HTTP/1.1 101 Switching Protocols\r\n'+
                          'Connection: Upgrade\r\n'+
                          'Upgrade: websocket\r\n'+
                           'Sec-WebSocket-Accept: '+crypt+'\r\n\r\n';
		   
		   this.socket.write(respns);

		}
		else
        {
            this.handleMessage(data);
        }
		 
		
	}
	socketclass.prototype.onend = function(){

	}
    socketclass.prototype.onconnect = function(){
        console.log('connect');
    }
    socketclass.onerror = function(err) {console.log(err, 'an error occured');}
    socketclass.prototype.onclose =function(){
              

    }


socketclass.prototype.handleMessage=function(data)
{
    var next = 2;
	var key =[];
	var decodedData;
	var senddata='';
	var length=0;
	var FIN = (data[0] & 0x80);
    var RSV1 = (data[0] & 0x40);
    var RSV2 = (data[0] & 0x20);
    var RSV3 = (data[0] & 0x10);
    var mask = (data[1] & 0x80);
	var Opcode = data[0]& 0x0F;
    var l = (data[1] & 0x7F);;
   
    if(mask===0)
    {
        length = data[1];
        
    }
    else{
        length = data[1] - 128;
    }

    if(length === 127)
    {
         var hb = data.readUInt32BE(2);
         if(hb !== 0)
           return;
         length = data.readUInt32BE(6);
         length = Math.abs(length);
         next +=2;
    }
    else if(length ===127)
	{
         var hb = data.readUInt32BE(2);
         if(hb !== 0)
           return;
         length = data.readUInt32BE(6);  
         length = Math.abs(length);
          next+=8;
    }

    //check what type of data it is
    if(Opcode === 0)
      this.continuouschunk = true;
    else
      this.continuouschunk = false;
    if(Opcode === 1   &&  this.databuffer.length ===0)
	          this.contentType = 'T';
    if(Opcode === 2  && this.databuffer.length ===0)
	          this.contentType = 'B';
    console.log(this.contentType,'ctype');
   if(this.databuffer.length === 0 && FIN === 0 && Opcode <=2 && Opcode >0)
    {
        
       this.chunks = true;
    }
    if(FIN !== 0 && Opcode <=2 && Opcode >=0)
    {
        
       this.chunks = false;
    }
    if(mask)
	{
	  key = data.slice(next, next + 4)
     
	  next += 4;
	}
   if(Opcode ===1 || Opcode ===2||Opcode === 0)
   {
      
        var message = data.slice(next,next+length);
        try
        {
           var decoded = new Buffer(message.length);
           for (var i = 0; i <  message.length; i++) {
		
              decoded[i] =  (message[i] ^ key[i % 4]);
              }     
 
        this.databuffer.push(decoded);

      if(this.chunks === false)
      {  
          var buf =Buffer.concat(this.databuffer);
           console.log(buf.toString());
          this.databuffer=[];
         
              // process messag however you ant in this case i write it back to the socket
               this.send(buf, this.contentType);
          }
         
         
      
         
     }
    catch(err)
     {
             console.log(err);
     }

        
    
   }

	
}



socketclass.prototype.send = function(data, type)
{
    
    var reservedBytes = [];
	reservedBytes[0]=129;
	var length = data.length;
  //  console.log(length);
	var startdata = 2;
	if(length <=125)
	{
		reservedBytes[1]=length;
	}
	else if(length >=126 && length <= 65535)
	{
		reservedBytes[1]=126;
		reservedBytes[2] = (length >>8) & 0xFF;
		reservedBytes[3] = (length & 0xFF);
		
		startdata = 4;
		
	}
	else
	{
       
		reservedBytes[1]=127;
		reservedBytes[2] = (length >> 56) & 0xFF;
		reservedBytes[3] = (length >> 48) & 0xFF;
		reservedBytes[4] = (length >> 40) & 0xFF;
		reservedBytes[4] = (length >> 32)& 0xFF;
		reservedBytes[6] = (length >> 24) & 0xFF;
		reservedBytes[7] = (length > 16) & 0xFF;
		reservedBytes[8] = (length >> 8) & 0xFF;
		reservedBytes[9] = (length & 0xFF);
		startdata = 10;
		
		
	}
    if(type === 'T')
    {
         if(data.length > 0)
         {
	       //for (var i = 0; i < data.length; i++){
             //reservedBytes.push(data.charCodeAt(i));
          //}
          try{

              var resbuff= new Buffer(reservedBytes);
              //console.log(typeof data, resbuff);
              var writebuff= Buffer.concat([resbuff,data]);
              
              this.socket.write(writebuff);

          }
          catch(err)
          {
              console.log(err);
          }
        }
    }
    if(type === 'B')
    {
        try
        {
           //var  mbuff = new Buffer(message.length)
           var rbbuf  = new Buffer(reservedBytes);
           var newbuf = Buffer.concat([rbbuf,data]);
           this.socket.write(newbuf); 
        }
        catch(err)
        {
            console.log(err);
        }
    }
}

module.exports = socketclass;