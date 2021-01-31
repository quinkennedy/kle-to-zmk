import {Row, Col, FormControl, Accordion, Card} from 'react-bootstrap';
import ZMKhid from '../zmk/data/hid';
import Button from 'react-bootstrap/Button';
import {useState, useEffect, Fragment} from 'react';

//TODO: doesn't include bluetooth codes
export const Codes = ZMKhid.map(e => e.names).flat();

var defaultMap = {
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
  'pgup':{name:'PAGE_UP'},
  'pgdn':{name:'PAGE_DOWN'},
  'pscr':{name:'PRINTSCREEN'},
  'pausebrk':{name:'PAUSE_BREAK'},
  'bt0':{name:'BT_SEL 0', bluetooth:true},
  'bt1':{name:'BT_SEL 1', bluetooth:true},
  'bt2':{name:'BT_SEL 2', bluetooth:true},
  'bt3':{name:'BT_SEL 3', bluetooth:true},
  'bt4':{name:'BT_SEL 4', bluetooth:true},
  'bt_clr':{name:'BT_CLR', bluetooth:true},
  'bt_nxt':{name:'BT_NXT', bluetooth:true},
  'bt_prv':{name:'BT_PRV', bluetooth:true},
  'ᛒ0':{name:'BT_SEL 0', bluetooth:true},
  'ᛒ1':{name:'BT_SEL 1', bluetooth:true},
  'ᛒ2':{name:'BT_SEL 2', bluetooth:true},
  'ᛒ3':{name:'BT_SEL 3', bluetooth:true},
  'ᛒ4':{name:'BT_SEL 4', bluetooth:true}
};
const wordRE = /[\S]+/;
defaultMap = ZMKhid.reduce(
  (result, entry) => {
    let key = wordRE.exec(entry.description)[0].toLocaleLowerCase();
    if (result.hasOwnProperty(key)){
      //console.log('duplicate ',key,result[key],entry.names);
    } else {
      result[key] = {name: entry.names[0]};
    }
    return result;
  },
  defaultMap
);
//add unique ids for each entry
Object.entries(defaultMap).forEach(([key, value], index) => {
  value.id = index;
});

function KeyMapEdit(props){
  const [updates, setUpdates] = useState({});
  const map = props.map;
  const setMap = props.setMap;
  let mappedNames = map ? Object.entries(map).map(([key, value]) => value.name) : [];
  let groupedCodes = ZMKhid.map(e => e.names);
  const unmappedCodeGroups = groupedCodes.filter(na => na.find(n => mappedNames.includes(n)) === undefined);
  const unmappedCodes = unmappedCodeGroups.map(na => na[0]);
  function updateMap(){
    var keys = Object.keys(map);
    var num = keys.length;
    let mapUpdates = Object.entries(updates).reduce((result, [code, key], index) => {
      //avoid key collision
      while (keys.includes(key)){
        key = '_' + key;
      }
      result[key] = {name:code, id:num};
      num++;
      return result;
    }, {});
    props.setMap(Object.assign({}, map, mapUpdates));
    setUpdates({});
  };
  function updateKey(oldKey, e){
    var newKey = e.target.value;
    //make sure the new key doesn't erase and existing key
    let keys = Object.keys(map);
    while (keys.includes(newKey)){
      newKey = '_' + newKey;
    }
    let newMap = Object.assign({}, map);
    let temp = newMap[oldKey];
    delete newMap[oldKey];
    newMap[newKey] = temp;
    setMap(newMap);
  /*
    let update = Object.assign({}, map?.[key], {name:value});
    setUpdates(Object.assign({}, updates, {key:update}));
    setChanged(true);*/
  };
  function updateCode(code, e){
    let newKey = e.target.value;
    let newUpdates = Object.assign({}, updates, {[code]:newKey});
    setUpdates(newUpdates);
  };
  useEffect(() => {
    if (map === undefined){
      console.log('updating default map');
      setMap(defaultMap);
    }
  },[map, setMap]);
  const all = map === undefined
    ? null
    : Object.entries(map)?.sort(([ak, av], [bk, bv]) => av.id - bv.id)?.map(([key, value], index) => (
      <Row key={value.id}>
        <Col>
          <FormControl defaultValue={key} onChange={e => updateKey(key, e)}/>
        </Col>
        <Col xs={1} className='map_arrow'>
          ->
        </Col>
        <Col>
          <FormControl value={value.name} disabled />
        </Col>
      </Row>
    ));
    const unmapd = unmappedCodes.map(c => (
      <Row key={c}>
        <Col>
          <FormControl onChange={e => updateCode(c, e)}/>
        </Col>
        <Col xs={1} className='map_arrow'>
          ->
        </Col>
        <Col>
          <FormControl value={c} disabled />
        </Col>
      </Row>
    ));
  const updateBtn = (
        <Row>
          <Col>
          <Button disabled={Object.keys(updates).length === 0} onClick={updateMap}>Update</Button>
          </Col>
          </Row>);
  return (
    <Fragment>
    <Accordion>
      <Card>
        <Accordion.Toggle as={Card.Header} eventKey='1'>
          Key Map
        </Accordion.Toggle>
        <Accordion.Collapse eventKey='1'>
        <Card.Body>
            {/*updateBtn*/}
        {all}
            {/*updateBtn*/}
        </Card.Body>
        </Accordion.Collapse>
      </Card>
      <Card>
        <Accordion.Toggle as={Card.Header} eventKey='2'>
          Unmapped Codes
        </Accordion.Toggle>
        <Accordion.Collapse eventKey='2'>
          <Card.Body>
                {updateBtn}
                {unmapd}
                {updateBtn}
                </Card.Body>
        </Accordion.Collapse>
      </Card>
    </Accordion>
    </Fragment>
  );
};

export default KeyMapEdit;
