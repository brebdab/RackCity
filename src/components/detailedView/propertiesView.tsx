import { Classes, Card, Elevation } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
// import axios from "axios";
import * as React from "react";
import { RouteComponentProps } from "react-router";
import "./propertiesView.scss";

export class PropertiesView extends React.PureComponent<RouteComponentProps> {

    // renderData(data: any) {
    //   var i = -1;
    //   return (
    //     <div>
    //       {data.columns.map((item: string) => {
    //         i++;
    //         var key = data.fields[i];
    //         return <h3 key={item}>{item}: {data[key]}</h3>
    //       })}
    //     </div>
    //   )
    // }

    renderData(columns: Array<any>, fields: Array<any>, data: any) {
      var i = -1;
      return (
        <div>
          {columns.map((item: string) => {
            i++;
            var key = fields[i];
            return <h3 key={item}>{item}: {data[key]}</h3>
          })}
        </div>
      )
    }

    public render() {
      let state: any;
      state = this.props;
      const data = state.state;
      const mid = data.columns.length/2 + 1
      return (
        <div className={Classes.DARK + " propsview"}>
          <Card interactive={true} elevation={Elevation.TWO}>
            <div className={"row"}>
              <div className={"column"}>
                {this.renderData(data.columns.slice(0, mid), data.fields.slice(0, mid), data)}
              </div>
              <div className={"column"}>
                {this.renderData(data.columns.slice(mid, data.fields.length), data.fields.slice(mid, data.fields.length), data)}
              </div>
            </div>
          </Card>
        </div>
      )
    }

}

export default PropertiesView
