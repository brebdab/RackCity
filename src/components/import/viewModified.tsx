import { Alert, AnchorButton, Classes, Tab, Tabs } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../api-config";
// import { ElementType, ModelObject } from "../utils";

interface ModifierProps {
  token: string,
  models?: Array<any>
}

export interface ModelObject {
  [key: string]: any
  vendor: string;
  model_number: string;
  height: string;
  display_color?: string;
  num_ethernet_ports?: string; //
  num_power_ports?: string; //
  cpu?: string;
  memory_gb?: string; //
  storage?: string;
  comment?: string;
}

const keys = ["vendor", "model_number", "height", "display_color", "num_ethernet_ports",
              "num_power_ports", "cpu", "memory_gb", "storage", "comment"]
const fields = ["Vendor", "Model #", "Height", "Display Color", "# Ethernet Ports",
                "# Power Ports", "CPU", "Memory (GB)", "Storage", "Comments"]

export class Modifier extends React.PureComponent<RouteComponentProps & ModifierProps> {

  render() {
    if (this.props.models !== undefined) {
      console.log(this.props.models[0])
      let model: ModelObject;
      model = this.props.models[0].existing;
      return (
        <div>
          {this.props.models.map((obj: any) => {
              return (
                <div>
                  <table className={"bp3-html-table"}>
                    <thead>
                      <tr>
                        <th>Modified or Original?</th>
                        {Object.keys(model).map((item: string) => {
                          if (item !== "id")
                            return <th>{item}</th>
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Existing</td>
                        {keys.map((key: string) => {
                          if (key !== "id")
                            return <td>{obj.existing[key]}</td>
                        })}
                      </tr>
                      <tr>
                        <td>Modified</td>
                        {keys.map((key: string) => {
                          if (key !== "id")
                            return <td>{obj.modified[key]}</td>
                        })}
                      </tr>
                    </tbody>
                  </table>
                  <h1>BUTTON</h1>
                </div>
              )
            })}
        </div>
      )
    } else {
      return <p>No data</p>
    }
  }

}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
  };
};

export default withRouter(connect(mapStatetoProps)(Modifier));
