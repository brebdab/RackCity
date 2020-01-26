import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
// import axios from "axios";
import * as React from "react";
import { RouteComponentProps } from "react-router";

export interface PropertiesProps {
  data: any;
 };

export class PropertiesView extends React.PureComponent<
  RouteComponentProps,
  PropertiesProps
  > {

    renderData(data: any) {
      return (
        <div>
          {data.columns.map((item: string) => {
            return <h1 key={item}>{item}</h1>
          })}
        </div>
      )
    }

    public render() {
      let state: any;
      state = this.props;
      const data = state.state;
      return (
        <div className={Classes.DARK + " propsview"}>
          {this.renderData(data)}
        </div>
      )
    }

}

export default PropertiesView
