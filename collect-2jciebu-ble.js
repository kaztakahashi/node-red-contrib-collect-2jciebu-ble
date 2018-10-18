module.exports = function(RED) {
    var configUUID;
    function Node2jciebuble(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var num = 0;
        node.on('input', function(msg) {
          var noble = require('noble');
          var allowDuplicates = false;
          var oneTime = true;
          if ( config.continuous ) { oneTime = false; };
          if ( config.dup ) { allowDuplicates = true; };
          if ( noble.state === 'poweredOn' ) {
                  noble.startScanning([], allowDuplicates);
		  num = 0;
	  };

          noble.on('stateChange', function(state) {
            if (state === 'poweredOn') {
              noble.startScanning([], allowDuplicates);
              num = 0;
            } else {
              noble.stopScanning();
            }
          });

          noble.on('discover', function(peripheral) {
            if (peripheral.advertisement && peripheral.advertisement.manufacturerData) {

              if ( config.uuid !== "used" ) {
		      configUUID = config.uuid;
	      } else {
		      configUUID = configUUID;
	      };

              var manufacturerData = peripheral.advertisement.manufacturerData;
              var type = manufacturerData.toString("hex");
              var buffer = manufacturerData;
              var uuid = peripheral.id;
              var macAddress = peripheral.id.match(/[0-9a-z]{2}/g).join(":");
              var rssi = peripheral.rssi;
              var now = new Date();

              if ( ( type.startsWith("d50201") && configUUID && macAddress.toLowerCase()  === configUUID.toLowerCase() )  || ( type.startsWith("d50201") && configUUID === '') ) {
                if (buffer.length == 21 ) {
                  var envData;
                  try {
                      var dataOffset = -5;
                      envData = {
                        UUID: uuid,
                        ID: macAddress,
                        rssi: rssi,
                        Temperature: buffer.readInt16LE(dataOffset + 9) / 100, // 単位：0.01 degC
                        Humidity: buffer.readUInt16LE(dataOffset + 11) / 100,  // 単位：0.01 %RH
                        ambient_light: buffer.readUInt16LE(dataOffset + 13),   // 単位：1 lx
                        pressure: buffer.readUInt32LE(dataOffset + 15) / 1000, // 単位：0.001 hPa
                        Noise: buffer.readUInt16LE(dataOffset + 19) / 100,     // 単位：0.01 dB
                        eTVOC: buffer.readUInt16LE(dataOffset + 21),           // 単位：ppb
                        eCO2: buffer.readUInt16LE(dataOffset + 23),            // 単位：ppm
                        timastamp: now.toISOString()
                    };
                  } catch(err) {
                    console.log(err);
                  }

                  if ( ( num === 0 && oneTime ) || ! oneTime ) {
                    if ( node.topic !== undefined && node.topic != "" ) msg.topic = node.topic;
                    msg.payload = envData;
                    node.send(msg);
                    num ++; 
                    if ( oneTime ) {
                      noble.stopScanning();
                      if (config.uuid !== "used" ) {
		        configUUID = config.uuid;
	              };
                      config.uuid = "used";
                      num ++; 
		    };
                  }
                  return true;
                }
              }
            }
          });
        });
    }
    RED.nodes.registerType("2jciebuble",Node2jciebuble);
}

