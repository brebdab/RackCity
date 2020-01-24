import * as React from "react";
import { RouteComponentProps } from "react-router";

export interface InstanceViewProps { iid: string };


export class InstanceView extends React.PureComponent<RouteComponentProps> {

  public render() {
    let params: any;
    params = this.props.match.params
    return <h1>instance {params.iid}</h1>
  }

}

export default InstanceView;
