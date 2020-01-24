import * as React from "react";
import { RouteComponentProps } from "react-router";

export interface Props { mid: string };


export class modelView extends React.PureComponent<RouteComponentProps> {

  public render() {
    let params: any;
    params = this.props.match.params
    return <h1>model {params.mid}</h1>
  }

}

export default modelView;
