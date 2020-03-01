import { Classes, Collapse } from "@blueprintjs/core";
import * as React from "react";
import { RouteComponentProps } from "react-router";
import ElementTabContainer from "../elementView/elementTabContainer";

var console: any = {};
console.log = function() {};
interface LandingViewState {}
interface LandingViewProps {}
class LandingView extends React.Component<
  RouteComponentProps & LandingViewProps,
  LandingViewState
> {
  showTabs() {
    const regex = new RegExp(
      "^/dashboard/(assets|models|datacenters|racks)|^/dashboard$"
    );
    if (regex.exec(this.props.location.pathname)) {
      return true;
    }
    return false;
  }
  public render() {
    return (
      <div className={Classes.DARK + " landing-view "}>
        <Collapse
          isOpen={this.showTabs()}
          transitionDuration={0}
          keepChildrenMounted={true}
        >
          <ElementTabContainer {...this.props} />
        </Collapse>
      </div>
    );
  }
}

export default LandingView;
