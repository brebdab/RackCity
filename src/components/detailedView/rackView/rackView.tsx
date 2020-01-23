import * as React from "react";
import { RouteComponentProps } from "react-router";

export interface RackViewProps { rid: string };


export class RackView extends React.PureComponent<RouteComponentProps> {

  public render() {
    let params: any;
    params = this.props.match.params
    return <h1>rack {params.rid}</h1>
  }

}

export default RackView;
