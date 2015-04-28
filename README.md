# node-red-example-liveupdates
An example of using Node-Red with both websockets and MQTT (via the Paho library) to allow live updates 
from and to a web page also generated using Node-Red.

You will need Node-Red installed correctly. The example also uses MQTT via Mosquitto with websocket support
compiled in along with the Paho MQTT library for the browser. You probably could use Mosca instead.

To use:
Put the .js file where it is accessible to the browser. 

In Node-Red:

Create a subflow to contain the output template (so you can reuse it multiple times). 

Create the Input Listener subflow.

Load the Input Page flow which creates a test page with lots of input elements:

Load the websocket listener flow that deals with incoming websocket traffic on "/ws/input".
