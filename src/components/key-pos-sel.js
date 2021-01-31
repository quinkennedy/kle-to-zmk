
function KeyPosSel(props){
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
            onChange={props.onChange}
            checked={props.checked === i ? 'checked' : false}
            value={i} />
        </div>
      </div>);});
      return (
            <div>
            <div className="keycap" id="label-move-src">
              <div className="keyborder"></div>
              <div className="keylabels">
                {keyRadio}
              </div>
            </div>
            </div>
          );
          };
          export default KeyPosSel;
