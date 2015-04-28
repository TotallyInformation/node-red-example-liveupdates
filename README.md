# node-red-example-liveupdates
An example of using Node-Red with both websockets and MQTT (via the Paho library) to allow live updates 
from and to a web page also generated using Node-Red.

You will need Node-Red installed correctly. The example also uses MQTT via Mosquitto with websocket support
compiled in along with the Paho MQTT library for the browser. You probably could use Mosca instead. The example web page makes use of Zurb Foundation and also uses a client-side helper library called "ReconnectingWebSocket". There are also some global variables in context.global that I pass in from the Node-Red startup file that contain IP addresses and ports but you can set them manually.

To use:
Put the .js file where it is accessible to the browser. 

In Node-Red:

Create a websocket configuration pointing at "/ws/input".

Create a subflow to contain the [output template](Master%20Page%20Subflow.md) (so you can reuse it multiple times). NB: Create the subflow then import the code.
![nr_master_page_subflow](https://cloud.githubusercontent.com/assets/1591850/7379008/8f3f7a44-ede9-11e4-9016-10995a95a356.png)

Create the [Input Listener subflow](Input%20Listener%20Subflow.md) so you can reuse it.
![nr_input_listener](https://cloud.githubusercontent.com/assets/1591850/7379009/8f41a454-ede9-11e4-8d5d-a9ddf388b276.png)

Load the [Input Page flow](Test%20Page%20Flow.md) which creates a test page with lots of input elements:

Load the [websocket listener flow](Websocket%20Listener%20Flow.md) that deals with incoming websocket traffic on "/ws/input".

![nr_liveupdate_flows](https://cloud.githubusercontent.com/assets/1591850/7379007/8f3ddb3a-ede9-11e4-86f0-643065d93b07.png)

Note that the code in the files should be copied and then use the import feature in Node-Red to add it.

You now have a set of flows that creates a page with a load of input examples. Interacting with any of them will immediately send information back to Node-Red over websockets where you can process it. You also have a set of MQTT listeners and a sender in the web page. The example assumes that the MQTT broker is on the same IP address as Node-Red & that it listens over websockets.
