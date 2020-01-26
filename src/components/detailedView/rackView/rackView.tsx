// import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
// import axios from "axios";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";

// pass in rack info as props

export interface RackViewProps {
  instances: any;
}
export interface RouteParams {
  rid: string;
}

export class RackView extends React.PureComponent<
  RouteComponentProps<RouteParams>,
  RackViewProps
> {
  public render() {
    console.log(this.props.match.params);
    // let params: any;
    // params = this.props.location.state;
    // console.log(params.rackname)
    // let params: any;
    // params = this.props.match.params
    return <h1>rack: {this.props.match.params.rid}</h1>;
  }
}

interface State {
  columns: Array<string>;
  data: any;
}

export class RackTable extends React.Component {
  public render() {
    return <p>hello</p>;
  }
}

export default withRouter(RackView);
