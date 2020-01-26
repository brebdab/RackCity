import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
// import axios from "axios";
import * as React from "react";
import { RouteComponentProps } from "react-router";

export class PropertiesView extends React.PureComponent<RouteComponentProps> {

    renderData(data: any) {
      var i = -1;
      return (
        <div>
          {data.columns.map((item: string) => {
            i++;
            var key = data.fields[i];
            return <h1 key={item}>{item}: {data[key]}</h1>
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
