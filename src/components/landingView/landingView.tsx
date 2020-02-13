import { Classes } from "@blueprintjs/core";
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
  public render() {
    return (
      <div className={Classes.DARK}>
        <ElementTabContainer {...this.props} />
      </div>
    );
  }
}

export default LandingView;
