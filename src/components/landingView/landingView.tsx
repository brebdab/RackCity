import { Callout, Classes } from "@blueprintjs/core";
import * as React from "react";
import ElementTabView from "../elementView/elementTabView";
import RackSelectView from "../elementView/rackSelectView";
class LandingView extends React.PureComponent {
  public render() {
    return (
      <div className={Classes.DARK}>
        <RackSelectView />
        <ElementTabView />
      </div>
    );
  }
}
export default LandingView;
