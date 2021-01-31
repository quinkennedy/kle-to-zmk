import './App.css';
import {useState, useEffect} from 'react';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Badge from 'react-bootstrap/Badge';
import JsonView from 'react-json-view';
import KPS from './components/key-pos-sel';
import SimpleList from './components/simple-list';
import KeyMap, {Codes} from './components/key-map-edit';
const KLESerial = require("@ijprest/kle-serial");
const JSON5 = require('json5');
const columnify = require('columnify');

const MAX_LAYERS = 12;
const wordRE = /[\S]+/;
const layerNames = [
  'TL','TC','TR',
  'ML','MC','MR',
  'BL','BC','BR',
  'FL','FC','FR'
];
const LAYER_PRE = 'L_';
function isLayerRef(key){
  return !!(key?.toLocaleUpperCase()?.startsWith(LAYER_PRE));
}

function App() {
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [parsedJson, setJson] = useState(undefined);
  const [kleJson, setKLE] = useState(undefined);
  const [zmkJson, setZMK] = useState(undefined);
  const [defaultLayer, setDefaultLayer] = useState(4);
  const [mapping, setMap] = useState(undefined);
  const [keymap, setKeymap] = useState('');
  const [unmappedKeys, setUnmappedKeys] = useState([]);
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
    var notMapped = [];
function keyToCode(key, altLayer){
  var code;
  var bt = false;
  if (key === undefined){
    code = undefined;
  } else if (Codes.includes(key.toLocaleUpperCase())){
    code = key.toLocaleUpperCase();
  } else {
    let keyWord = wordRE.exec(key)[0];
    var mapped = mapping[keyWord.toLocaleLowerCase()];
    if (mapped === undefined){
      if (!isLayerRef(key)){
        notMapped.push(key);
      }
      code = undefined;
    } else {
      bt = !!mapped.bluetooth;
      code = mapped.name;
    }
  }
  var result = '&trans';
  if (code === undefined){
    if (altLayer){
      result = '&mo ' + altLayer;
    }
    if (key !== undefined){
      result += ' /*'+key+'*/';
    }
  } else {
    if (altLayer){
      result = '&lt ' + altLayer + ' ' + code;
    } else {
      if (bt) {
        result = '&bt ' + code;
      } else {
        result = '&kp ' + code;
      }
    }
  }
  return result;
};
    if (kleJson){
      var layers = new Array(MAX_LAYERS);
      //https://stackoverflow.com/a/14438954
      let rows = kleJson.keys.map(k => k.y).filter((v,i,a) => a.indexOf(v) === i);
      for(var i = 0; i < MAX_LAYERS; i++){
        layers[i] = new Array(rows.length);
        for(var j = 0; j < rows.length; j++){
          layers[i][j] = [];
        }
      }
      kleJson.keys.forEach(k => {
        for(var i = 0; i < MAX_LAYERS; i++){
          layers[i][rows.indexOf(k.y)].push({label:k.labels?.[i]});
        }
      });
      var customLayerNames = {};
      var customLayerKeys = {};
      layers.forEach((layer, lindex) =>
        {
          layer.forEach((row, rindex) =>
            {
              row.forEach((key, kindex) =>
                {
                  if (isLayerRef(key.label))
                  {
                    customLayerNames[lindex] = key.label;
                    customLayerKeys[rindex] = {[kindex]:key.label};
                  }
                });
            });
        });
      var currLayerNames = Object.assign([], layerNames, customLayerNames);
      [layers[defaultLayer], layers[0]] = [layers[0], layers[defaultLayer]];
      [currLayerNames[defaultLayer], currLayerNames[0]] =
        [currLayerNames[0], currLayerNames[defaultLayer]];
      setZMK(layers);
      let preamble =
`#include <behaviors.dtsi>
#include <dt-bindings/zmk/keys.h>
#include <dt-bindings/zmk/bt.h>
` + Object
    .entries(currLayerNames)
    .filter(([key, value]) => isLayerRef(value))
    .map(([key, value]) => '#define ' + value + ' ' + key).join('\n') +
`
{
  keymap {
    compatible="zmk,keymap";`;
      setKeymap(preamble + layers.reduce((result, layer, lindex) => {
        return result + '\n\t\t' + currLayerNames[lindex] + `_layer {
          bindings = <
` + columnify(layer.map((row, rindex) => row.map((key, kindex) => keyToCode(key.label, lindex === 0 ? customLayerKeys[rindex]?.[kindex] : undefined))), {showHeaders:false}) +
`
          >;
        };`;
      }, '') +
`
  };
};`);
      //make unique
      notMapped = notMapped.filter((v,i,a) => a.indexOf(v) === i);
      setUnmappedKeys(notMapped);
    }
  }, [kleJson, defaultLayer, mapping]);
  function defaultSelection(e){
    setDefaultLayer(parseInt(e.target.value));
  };
  return (
    <Container>
      <Row>
        <Col>
        <h1>
          <Badge variant='warning'>ALPHA</Badge>
            KLE to ZMK converter
          <Badge variant='warning'>ALPHA</Badge>
          </h1>
        </Col>
      </Row>
      <Row>
      <Col>
      Converts layouts created with
      <a href='http://www.keyboard-layout-editor.com'> Keyboard Layout Editor </a>
      to keymaps for use with the
      <a href='https://zmkfirmware.dev'> ZMK Firmware </a>
      </Col>
      </Row>
      <Row>
        <Col xs={5} md={6} lg={7} xl={8} >
      <Row>
        <Col>
          <Form.Group>
            <Form.Label>
              Default Layer
            </Form.Label>
            <KPS onChange={defaultSelection} checked={defaultLayer} />
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
      </Col>
      <Col>
      <KeyMap map={mapping} setMap={setMap} />
      <SimpleList list={unmappedKeys} />
      </Col>
      </Row>
    </Container>
  );
};

export default App;
