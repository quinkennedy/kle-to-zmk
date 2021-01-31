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
function keyToCode(key){
  var code;
  if (key === undefined){
    code = '&trans';
  } else if (Codes.includes(key.toLocaleUpperCase())){
    code = '&kp ' + key.toLocaleUpperCase();
  } else {
    let keyWord = wordRE.exec(key)[0];
    var mapped = mapping[keyWord.toLocaleLowerCase()];
    if (mapped === undefined){
      notMapped.push(key);
      code = '&trans /*' + key + '*/';
    } else if (mapped.bluetooth){
      code = '&bt ' + mapped.name;
    } else {
      code = '&kp ' + mapped.name;
    }
    if (mapped !== undefined && keyWord !== key){
      code += ' /*'+key+'*/';
    }
  }
  return code;
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
      [layers[defaultLayer], layers[0]] = [layers[0], layers[defaultLayer]];
      var currLayerNames = Object.assign([], layerNames);
      [currLayerNames[defaultLayer], currLayerNames[0]] =
        [currLayerNames[0], currLayerNames[defaultLayer]];
      setZMK(layers);
      let preamble = '#include <behaviors.dtsi>\n#include <dt-bindings/zmk/keys.h>\n#include <dt-bindings/zmk/bt.h>\n{\n\tkeymap {\n\t\tcompatible="zmk,keymap";';
      setKeymap(preamble + layers.reduce((result, layer, index) => {
        return result + '\n\t\t' + currLayerNames[index] + '_layer {\n\t\t\tbindings = <\n' + columnify(layer.map(row => row.map(k => keyToCode(k.label))), {showHeaders:false}) + '\n\t\t\t>;\n\t\t};';
      }, '') + '\n\t};\n};');
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
