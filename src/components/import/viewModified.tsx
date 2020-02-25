import { AnchorButton } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../utils/api-config";
import "./import.scss";
import { ModelObject, RackObject, PowerConnection } from "../../utils/utils";

interface ModifierProps {
  token: string;
  modelsModified?: Array<any>;
  modelsIgnored?: number;
  modelsAdded?: number;
  callback: Function;
  operation: string;
}
var console: any = {};
console.log = function () { };

export interface AssetObject {
  [key: string]: any;
  hostname: string;
  rack_position: string;
  model: ModelObject;
  rack: RackObject;
  owner?: string;
  comment?: string;
  id: string;
  asset_number: number;
  datacenter: string;
  power_port_connection_1: PowerConnection;
  power_port_connection_2: PowerConnection
}

export interface ModelObjectMod {
  [key: string]: any;
  vendor: string;
  model_number: string;
  height: string;
  display_color?: string;
  network_ports?: string; //
  power_ports?: string; //
  cpu?: string;
  memory?: string; //
  storage?: string;
  comment?: string;
  id: string;
  network_port_name_1?: string;
  network_port_name_2?: string;
  network_port_name_3?: string;
  network_port_name_4?: string;
}

interface Check {
  model: any;
  checked: boolean;
}

interface ModifierState {
  modifiedModels: Array<Check>;
}

export class Modifier extends React.PureComponent<
  RouteComponentProps & ModifierProps,
  ModifierState
  > {
  public state: ModifierState = {
    modifiedModels: []
  };

  renderModifications(model: any, fields: any) {
    for (let i = 0; i < this.props.modelsModified!.length; i++) {
      let obj = this.props.modelsModified![i]
      let checkObj: Check;
      checkObj = { model: obj.modified, checked: false };
      this.state.modifiedModels.push(checkObj);
      return (
        <div>
          <table className={"bp3-html-table"}>
            <thead>
              <tr>
                <th>Modified or Original?</th>
                {Object.keys(model).map((item: string) => {
                  console.log(item)
                  if (item !== "id") {
                    if (item === "power_connections") {
                      return <th></th>
                    } else
                      return <th>{fields[item]}</th>;
                  }
                  // TODO might need to make separate fields arrays based on this.props.operation
                  else return <th> </th>;
                })}
                {this.props.operation === "assets" ? <th>Power Port 1</th> : null}
                {this.props.operation === "assets" ? <th>Power Port 2</th> : null}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Existing</td>
                {Object.keys(model).map((key: string) => {
                  if (key === "rack")
                    return (
                      <td>
                        {obj.existing.rack.rack_num +
                          "" +
                          obj.existing.rack.row_letter}
                      </td>
                    );
                  else if (key === "model")
                    return (
                      <td>
                        {obj.existing.model.vendor +
                          " " +
                          obj.existing.model.model_number}
                      </td>
                    );
                  else if (key !== "id") {
                    if (key !== "power_connections")
                      return <td>{obj.existing[key]}</td>;
                    else {
                      return <td></td>
                    }
                  }
                  else return <td> </td>;
                })}
                {this.props.operation === "assets" ? Object.keys(obj.existing.power_connections).map((portNum: string) => {
                  return <td>{obj.existing.power_connections[portNum].left_right}{obj.existing.power_connections[portNum].port_number}</td>
                }) : null}
              </tr>
              <tr>
                <td>Modified</td>
                {Object.keys(model).map((key: string) => {
                  if (key === "rack")
                    return (
                      <td>
                        {obj.modified.rack.rack_num +
                          "" +
                          obj.modified.rack.row_letter}
                      </td>
                    );
                  else if (key === "model")
                    return (
                      <td>
                        {obj.modified.model.vendor +
                          " " +
                          obj.modified.model.model_number}
                      </td>
                    );
                  else if (key !== "id") {
                    if (key !== "power_connections")
                      return <td>{obj.modified[key]}</td>;
                    else {
                      return <td></td>
                    }
                  }
                  else return <td> </td>;
                })}
                {this.props.operation === "assets" ? Object.keys(obj.modified.power_connections).map((portNum: string) => {
                  return <td>{obj.modified.power_connections[portNum].left_right}{obj.modified.power_connections[portNum].port_number}</td>
                }) : null}
              </tr>
            </tbody>
          </table>
          <div className={"upload-button"}>
            <Checks
              {...this.props}
              linkedModel={obj.modified}
              callback={(model: any) => {
                var index = this.state.modifiedModels.findIndex(
                  (element: Check) => {
                    return element.model === model; // TODO might need to make Check type have model: any
                  }
                );
                let check: Array<Check>;
                check = this.state.modifiedModels;
                check[index].checked = !check[index].checked;
                this.setState({
                  modifiedModels: check
                });
                // this.state.modifiedModels[index].checked = !this.state.modifiedModels[index].checked
              }}
            />
          </div>
        </div>
      );
    }
  }

  render() {
    if (this.props.modelsModified !== undefined) {
      console.log(this.props.modelsModified[0]);
      let model: any;
      model = this.props.modelsModified[0].existing;
      let fields: any;
      if (this.props.operation === "models") {
        fields = {
          vendor: "Vendor",
          model_number: "Model Number",
          height: "Height",
          display_color: "Display Color",
          network_ports: "Network Ports",
          power_ports: "Power Ports",
          cpu: "CPU",
          memory: "Memory",
          storage: "Storage",
          comment: "Comments",
          id: "",
          network_port_name_1: "Network Port #1 Name",
          network_port_name_2: "Network Port #2 Name",
          network_port_name_3: "Network Port #3 Name",
          network_port_name_4: "Network Port #4 Name"
        };
      } else if (this.props.operation === "assets") {
        fields = {
          asset_number: "Asset Number",
          hostname: "Hostname",
          datacenter: "Datacenter",
          rack_position: "Rack position (U)",
          model: "Model",
          rack: "Rack",
          owner: "Owner",
          comment: "Comments",
          id: "",
          power_port_connection_1: "Power Port #1 Connection",
          power_port_connection_2: "Power Port #2 Connection"
        };
      }

      return (
        <div>
          {this.renderModifications(model, fields)}
          <h1> </h1>
          <AnchorButton
            className={"upload-button"}
            large={true}
            intent="success"
            icon="import"
            text="Confirm Changes"
            onClick={() => {
              if (
                this.state.modifiedModels.length !== 0 &&
                this.props.operation === "models"
              ) {
                let modified: Array<ModelObjectMod>;
                modified = [];
                for (var i = 0; i < this.state.modifiedModels.length; i++) {
                  if (this.state.modifiedModels[i].checked)
                    modified.push(this.state.modifiedModels[i].model);
                }
                uploadModified(
                  modified,
                  this.props.token,
                  this.props.operation
                ).then(
                  res => {
                    console.log(this.props);
                    alert(
                      "Success! Modified: " +
                      modified.length +
                      "; Added: " +
                      this.props.modelsAdded! +
                      "; Ignored: " +
                      (this.props.modelsIgnored! +
                        this.props.modelsModified!.length -
                        modified.length)
                    );
                    this.setState({
                      modifiedModels: []
                    });
                    this.props.callback();
                  },
                  err => {
                    alert(err.response.data.failure_message);
                  }
                );
              } else {
                // TODO check this works and refactor
                let modified: Array<AssetObject>;
                modified = [];
                for (i = 0; i < this.state.modifiedModels.length; i++) {
                  if (this.state.modifiedModels[i].checked)
                    modified.push(this.state.modifiedModels[i].model);
                }
                uploadModified(
                  modified,
                  this.props.token,
                  this.props.operation
                ).then(
                  res => {
                    alert(
                      "Success! Modified: " +
                      modified.length +
                      "; Added: " +
                      this.props.modelsAdded! +
                      "; Ignored: " +
                      (this.props.modelsIgnored! +
                        this.props.modelsModified!.length -
                        modified.length)
                    );
                    // alert("Modifications were successful")
                    this.setState({
                      modifiedModels: []
                    });
                    this.props.callback();
                  },
                  err => {
                    alert(err.response.data.failure_message);
                  }
                );
              }
            }}
          />
        </div>
      );
    } else {
      return <p>No data</p>;
    }
  }
}
// TODO make Array<ModelObjectMod any, assuming the POST header format is the same
async function uploadModified(
  modelList: Array<any>,
  token: string,
  operation: string
) {
  console.log(API_ROOT + "api/" + operation + "/bulk-approve");
  console.log(token);
  console.log(modelList);
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return await axios
    .post(
      API_ROOT + "api/" + operation + "/bulk-approve",
      { approved_modifications: modelList },
      headers
    )
    .then(res => {
      console.log(res.data);
      const data = res.data;
      return data;
    });
}

interface CheckboxProps {
  linkedModel: any;
  callback: Function;
}

class Checks extends React.PureComponent<RouteComponentProps & CheckboxProps> {
  constructor(props: any) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  render() {
    return (
      <label className={"bp3-control bp3-checkbox"}>
        <input type="checkbox" onChange={this.handleChange} />
        <span className={"bp3-control-indicator"}></span>
        Replace existing with modified?
      </label>
    );
  }

  private handleChange() {
    this.props.callback(this.props.linkedModel);
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(Modifier));
