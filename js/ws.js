/*jshint browser: true, devel: true, jquery: true*/
/*global wsPath, ReconnectingWebSocket, doOnConnect, doOnRecieve, Foundation, Paho*/

// Control script for starting both standard websockets
// and mqtt over websocket

// This is a library script that can be reused. It assumes jQuery.
// It also needs two variables:
//   var wsPath: the websocket path to listen to without the leading "/ws/"
//   fn  doModelUpdate(data): Function to do something with the recieved data

// Handle uiInput changes, output standard event with standard data
// Simplifies handling of any form elements
// Triggers the custom event: 'uiInputChange' when any type of input changes
var uiInput = function() {
	
	//NB: Handle Zurb Foundation slider (a div with a special attibute)
	// Only detect mouse up event otherwise too many triggers
	$('.range-slider-handle').on('mouseup', function(e){
		// We are handling slider handle, we need the parent slider
		var $this = $( this ).parent();

		// If a form element changes, send change data back to server over websocket
		// Don't get so much from the slider, no name only ID
		$( 'body' ).trigger( {
			'type' : 'uiInputChange', // The custom event name triggered
			'payload' : {
				'id' 		: $this.prop("id"),
				'val' 		: $this.attr('data-slider'),
				// HTML Tag type
				'tag' 		: $this.prop("tagName"), // html tag
				'inpType' 	: 'slider',				 // the input type
				'frmId'		: $this.closest('form').attr('id'),
				'timestamp' : e.timeStamp,
				'url'		: location.pathname,
				'query'		: location.search
			}
		} );
	});

	// Select all types of button including links pointed at '#', exclude splits so that dropdowns work.
	// TODO: Foundation split with custom pip not working. input[type=file] doesn't show file upload selector
	$('button, a[href="#"], input[type="button"], input[type="reset"], input[type="submit"], input[type="image"], input[type="file"]').
			not('.split, a[data-dropdown]').not('.button[href!="#"]').click( function(e) {
		//this == the link that was clicked, e == the dom event (e.target == the dom element clicked)
		//console.dir(e);

		var $this = $( this );

		$( 'body' ).trigger( {
			// The custom event name triggered
			'type' : 'uiInputChange',
			'payload' : {
				// html id of the element that triggered the click event
				'id' 			: $this.prop("id"),
				// If value not set on button, use the contained text (for <button> and Foundation's a.button)
				'val' 			: $this.val() || $this.text(),
				// HTML Tag type
				'tag' 			: $this.prop("tagName"),
				// What type of input field
				'inpType' 		: e.target.type,
				// ID of the form this input field belongs to
				'frmId'			: $this.closest('form').attr('id'),
				// Name of the input element (don't confuse with the ID)
				'name' 			: $this.prop("name"),
				// Buttons can have href links
				'href' 			: $this.prop("href"),
				// Image buttons can have an image src
				'src' 			: $this.prop("src"),
				'timestamp' 	: e.timeStamp,
				// Where are we? Used on server to id which page this is from
				'url'			: location.pathname,
				'query'			: location.search
			}
		} );
		
		// For foundation split/dropdown's, the dropdown will not close since we have
		// prevented any actions by returning false.
		// This closes the dropdown after clicking on one of the list links
		if ( $this.parent().parent().is('.f-dropdown') ) {
			//console.log("Dropdown link clicked");
			//e.stopImmediatePropagation();
			e.preventDefault();
			Foundation.libs.dropdown.close( $this.parent() );
		}
		//e.stopPropagation();
		//e.preventDefault();
		return false;
	});

	//NB: Doesn't handle Foundation slider (has custom change event) nor buttons (use click event not change)
	$('input, textarea, select').change(function(e) {
		//console.log("input change");
		//console.dir(e);

		// If a form element changes, send change data back to server over websocket
		// There is little consistency in what gets populated.
		$( 'body' ).trigger( {
			// The custom event name triggered
			'type' : 'uiInputChange',
			'payload' : {
				// html id of the element that triggered the click event
				'id' 			: $( this ).prop("id"),
				// returns an array for multi-selects
				'val' 			: $( this ).val(),
				// Will be on/off for switches/checkboxes
				'checked' 		: $( this ).prop("checked"),
				// HTML Tag type
				'tag' 			: $( this ).prop("tagName"),
				// What type of input field
				'inpType' 			: e.target.type,
				// ID of the form this input field belongs to (if any)
				'frmId'			: $( this ).closest('form').attr('id'),
				// Name of the input element (don't confuse with the ID)
				'name' 			: $( this ).prop("name"),
				'willValidate' 	: e.target.willValidate,
				'placeHolder' 	: e.target.placeHolder,
				'defaultValue' 	: e.target.defaultValue,
				'timestamp' 	: e.timeStamp,
				// Where are we? Used on server to id which page this is from
				'url'			: location.pathname,
				'query'			: location.search
			}
		} );

		// Avoid any standard action
		return false;
	});

}; // ---- End of function uiInput ---- //

/* Initialise websockets (if reqd). 
 * @param wsPath      [string]: The socket path e.g. '/ws/<wsPath>'
 * @param fnOnRecieve [fn()]: This function will be run when socket is successfully opened
 * @param fnOnOpen    [fn(data)]: Will be run when socket recieves data
 * Assumes that the ws host is the same as the current web host
 */
// *** TODO: THIS SHOULD PROBABLY BE A CLASS so multi instances can be created ***
var wsStart = function( wsPath, fnOnOpen, fnOnRecieve ) {
	if (!wsPath) return;
	
    // We need to know if we are on a secure connection or not
    var wsProto = location.protocol == 'http:' ? 'ws:' : 'wss:';
    // and where the server is
    var wsUri = wsProto + '//' + location.host + '/ws/' + wsPath;

    //var ws = new WebSocket( wsUri );
	// Use reconnecting-websocket to auto reconnect every 5 sec
	//	@see https://github.com/joewalnes/reconnecting-websocket
	var ws = new ReconnectingWebSocket( wsUri, null, {
		debug: false, 
		reconnectInterval: 5000
	} );

    ws.onopen = function(){
        //console.log( 'Web Socket open!' );		
		fnOnOpen();
		
		// -- Send a msg each time ANY input changes for ANY form -- //
		//	  Uses custom event defined in function uiInput
		$( 'body' ).on( 'uiInputChange', function(e) {
			ws.send( JSON.stringify(e.payload));
		} );
		
    }; // --- End of onopen --- //

	// We are using reconnecting-websocket library so we don't have to worry about close
    //ws.onclose = function(){};

    ws.onerror = function(err){
        /*Send a message to the console if the connection errors */
        console.log( '--- Web socket error: ---' );
        console.log( err );
    };

	// If we recieve a msg, run the fn passed in (fnOnRecieve)
    ws.onmessage = function( wsMsg ){
        // Parse the incoming data from Node-Red (expecting JSON stringified)
		// TODO: Add try/catch to handle JSON errors
		var data = JSON.parse(wsMsg.data);
        
		//console.log( '--- Web socket message: ' + data.topic + '---' );
        //console.dir( data.payload );

        // Do something with the data
        // This fn is passed in as an arg
        fnOnRecieve(data);
    };
	
}; // --- End of function wsStart --- //

var mqttStart = function() {
	// @see http://www.eclipse.org/paho/files/jsdoc/symbols/Paho.MQTT.Client.html
	
	var reconnectTimeout = 2000;
	
	// Create a client instance
	var mqtt = new Paho.MQTT.Client( location.hostname, 9001, "web_" + parseInt(Math.random() * 100, 10) );

	// @see http://www.eclipse.org/paho/files/jsdoc/symbols/Paho.MQTT.Client.html#connect
	var options = {
		timeout: 3,
		//useSSL: useTLS,
		cleanSession: true,
		onSuccess: onConnect,
		onFailure: function (message) {
			$('#status').val("Connection failed: " + message.errorMessage + "Retrying");
			setTimeout(mqttStart, reconnectTimeout);
		}
	};
	// set callback handlers
	mqtt.onConnectionLost = onConnectionLost;
	mqtt.onMessageArrived = onMessageArrived;

	// connect the client
	mqtt.connect(options);

	// called when the client connects
	function onConnect() {
		// Once a connection has been made, make a subscription and send a message.
		console.log("onConnect");

		// Subscribe to required msgs
		mqtt.subscribe("TEMPERATURE/#");
		mqtt.subscribe("HUMIDITY/#");
		mqtt.subscribe("LIGHT/#");
		mqtt.subscribe("MOVEMENT/#");
		mqtt.subscribe("SWITCHES/#");
		mqtt.subscribe("SENSORS/#");
		
		// Send something (test)
		var message = new Paho.MQTT.Message("Hello");
		message.destinationName = "/World";
		mqtt.send(message); 
	}

	// called when the client loses its connection
	function onConnectionLost(responseObject) {
		if (responseObject.errorCode !== 0) {
			console.log("onConnectionLost:"+responseObject.errorMessage);
		}
	}

	// called when a message arrives
	function onMessageArrived(message) {
		console.log("onMessageArrived: " + message.payloadString + ", From: " + message.destinationName + " (QoS: " + message.qos +", Retained: " + message.retained + ")");
		$('#' + message.destinationName.replace(/\//g,'_')).text(message.payloadString);
	}
}; // --- End of function mqttStart --- //

// Only kick things off when the whole document is loaded
$( document ).ready(function() {
    // Initialise Foundation menu
    $(document).foundation();
	
	// Turn on custom event triggers for ALL user input
	uiInput();
    
    /* Initialise websockets (if reqd). Parameters:
	 * @param wsPath      [string]: The socket path e.g. '/ws/<wsPath>'
	 * @param fnOnRecieve [fn()]: This function will be run when socket is successfully opened
	 * @param fnOnOpen    [fn(data)]: Will be run when socket recieves data
	 * NB: the 2 fns should be defined in Node-Red & passed into the template
	 */
	if ( !('wsPath' in window) ) { window.wsPath = null; }
	if ( !('doOnWsConnect' in window) ) { window.doOnWsConnect = function(){return;}; }
	if ( !('doOnWsRecieve' in window) ) { window.doOnWsRecieve = function(){return;}; }
	wsStart( window.wsPath, window.doOnWsConnect, window.doOnWsRecieve );
	    
    // Initialise mqtt over websockets (if reqd)
	if ( ('mqttGo' in window) ) { 
		if (window.mqttGo) {
			mqttStart();
		}
	}
});
