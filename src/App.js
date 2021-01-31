import './App.css';
import {useState, useEffect} from 'react';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import JsonView from 'react-json-view';
import ZMKhid from './zmk/data/hid';
const KLESerial = require("@ijprest/kle-serial");
const JSON5 = require('json5');

const MAX_LAYERS = 12;
window.mapping = {
  '↹':{name:'TAB'},
  '⌫':{name:'BACKSPACE'},
  'esc':{name:'ESCAPE'},
  '⌦':{name:'DELETE'},
  '≣':{name:'K_CONTEXT_MENU'},
  '⏎':{name:'RETURN'},
  '⌘':{name:'LEFT_COMMAND'},
  '⌥':{name:'LEFT_ALT'},
  '⌃':{name:'LEFT_CONTROL'},
  '⇧':{name:'LEFT_SHIFT'},
  '↑':{name:'UP_ARROW'},
  '→':{name:'RIGHT_ARROW'},
  '↓':{name:'DOWN_ARROW'},
  '←':{name:'LEFT_ARROW'},
  'bt0':{name:'BT_SEL 0', bluetooth:true},
  'bt1':{name:'BT_SEL 1', bluetooth:true},
  'bt2':{name:'BT_SEL 2', bluetooth:true},
  'bt3':{name:'BT_SEL 3', bluetooth:true},
  'bt4':{name:'BT_SEL 4', bluetooth:true},
  'ᛒ0':{name:'BT_SEL 0', bluetooth:true},
  'ᛒ1':{name:'BT_SEL 1', bluetooth:true},
  'ᛒ2':{name:'BT_SEL 2', bluetooth:true},
  'ᛒ3':{name:'BT_SEL 3', bluetooth:true},
  'ᛒ4':{name:'BT_SEL 4', bluetooth:true}
};
const wordRE = /[\S]+/;
window.mapping = ZMKhid.reduce(
  (result, entry) => {
    let key = wordRE.exec(entry.description)[0].toLocaleLowerCase();
    if (result.hasOwnProperty(key)){
      console.log('duplicate ',key,result[key],entry.names);
    } else {
      result[key] = {name: entry.names[0]};
    }
    return result;
  },
  window.mapping
);
function keyToCode(key){
  var code;
  if (key === undefined){
    code = ' &trans ';
  } else {
    let keyWord = wordRE.exec(key)[0];
    var mapped = window.mapping[keyWord.toLocaleLowerCase()];
    if (mapped === undefined){
      console.log('[keyToCode] err:',key);
      code = ' &trans /*' + key + '*/ ';
    } else if (mapped.bluetooth){
      code = ' &bt ' + mapped.name + ' ';
    } else {
      code = ' &kp ' + mapped.name + ' ';
    }
    if (mapped !== undefined && keyWord != key){
      code += '/*'+key+'*/ ';
    }
  }
  return code;
};
const layerNames = [
  'TL','TC','TR',
  'ML','MC','MR',
  'BL','BC','BR',
  'FL','FC','FR'
];

function App() {
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [parsedJson, setJson] = useState(undefined);
  const [kleJson, setKLE] = useState(undefined);
  const [zmkJson, setZMK] = useState(undefined);
  const [defaultLayer, setDefaultLayer] = useState(4);
  const [mapping, setMap] = useState(window.mapping);
  const [keymap, setKeymap] = useState('');
  function clearErrorMessage(){
    setErrorMessage(undefined);
  }
  function updatedKLE(e){
    var kle = e.target.value;
    try{
      var j = JSON5.parse(kle);
      setJson(j);
      setKLE(KLESerial.Serial.deserialize(j));
      clearErrorMessage();
    } catch (e){
      if (e instanceof SyntaxError && e.message.startsWith("JSON5: invalid character ',' at ")){
        kle = "["+kle+"]";
        try {
          j = JSON5.parse(kle);
          setJson(j);
          setKLE(KLESerial.Serial.deserialize(j));
          clearErrorMessage();
        } catch (e2){
          setErrorMessage(e.message + ' --> ' + e2.message);
        }
      } else {
        setErrorMessage(e.message);
      }
    }
  };
  useEffect(() => {
    if (kleJson){
      var layers = new Array(MAX_LAYERS);
      for(var i = 0; i < layers.length; i++){
        layers[i] = [];
      }
      kleJson.keys.forEach(k => {
        for(var i = 0; i < MAX_LAYERS; i++){
          layers[i].push(k.labels?.[i]);
        }
      });
      [layers[defaultLayer], layers[0]] = [layers[0], layers[defaultLayer]];
      var currLayerNames = Object.assign([], layerNames);
      [currLayerNames[defaultLayer], currLayerNames[0]] =
        [currLayerNames[0], currLayerNames[defaultLayer]];
      setZMK(layers);
      setKeymap('#include <behaviors.dtsi>\n#include <dt-bindings/zmk/keys.h>\n#include <dt-bindings/zmk/bt.h>\n{ keymap { compatible="zmk,keymap"; ' + layers.reduce((result, layer, index) => {
        return result + currLayerNames[index] + '_layer { bindings = < ' + layer.reduce((res, key) => {
          return res + keyToCode(key);
        }, '') + ' >; }; ';
      }, '') + ' }; }; ');
    }
  }, [kleJson, defaultLayer]);
  function defaultSelection(e){
    setDefaultLayer(parseInt(e.target.value));
  };
  const keyRadio = new Array(12).fill(false).map((a,i) => {
    return (
      <div key={i} ng-repeat="i in [0,1,2,3,4,5,6,7,8,9,10,11]" className={"keylabel keylabel"+i}>
        <div>
          <input
            type="radio"
            name="fromId"
            ng-model="$parent.moveFromId"
            ng-value="i"
            className="ng-pristine ng-valid"
            onChange={defaultSelection}
            checked={defaultLayer === i ? 'checked' : false}
            value={i} />
        </div>
      </div>);});
  return (
    <Container>
      <Row>
        <Col>
          <strong>ALPHA</strong> Keyboard Layout Editor to ZMK Keymap converter <strong>ALPHA</strong>
        </Col>
      </Row>
      <Row>
        <Col>
          <Form.Group>
            <Form.Label>
              Default Layer
            </Form.Label>
            <div>
            <div className="keycap" id="label-move-src">
              <div className="keyborder"></div>
              <div className="keylabels">
                {keyRadio}
              </div>
            </div>
            </div>
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col>
          <Form.Group>
            <Form.Label>
              Keyboard Layout Editor "Raw Data"
            </Form.Label>
            <Form.Control id='txt_kle' as='textarea' rows={5} onChange={updatedKLE} />
            {errorMessage ? (<Form.Text id='txt_kle_err'>{errorMessage}</Form.Text>) : null}
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col>
          <Form.Group>
            <Form.Label>
              Input Json
            </Form.Label>
            <JsonView src={parsedJson} collapsed />
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col>
          <Form.Group>
            <Form.Label>
              KLE Json
            </Form.Label>
            <JsonView src={kleJson} collapsed />
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col>
          <Form.Group>
            <Form.Label>
              ZMK Json
            </Form.Label>
            <JsonView src={zmkJson} collapsed />
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col>
          <Form.Group>
            <Form.Label>
              ZMK Keymap
            </Form.Label>
            <Form.Control id='txt_zmk' as='textarea' rows={5} readOnly value={keymap} />
          </Form.Group>
        </Col>
      </Row>
    </Container>
  );
};

export default App;
