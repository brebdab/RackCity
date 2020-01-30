import { Alert, AnchorButton, Classes, Tab, Tabs } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../api-config";
import "./import.scss";

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
  id: string
}

interface Check {
  model: ModelObject,
  checked: boolean
}

interface ModifierState {
  modifiedModels: Array<Check>
}

const keys = ["vendor", "model_number", "height", "display_color", "num_ethernet_ports",
              "num_power_ports", "cpu", "memory_gb", "storage", "comment"]
const fields = ["Vendor", "Model #", "Height", "Display Color", "# Ethernet Ports",
                "# Power Ports", "CPU", "Memory (GB)", "Storage", "Comments"]

export class Modifier extends React.PureComponent<RouteComponentProps & ModifierProps, ModifierState> {

  public state: ModifierState = {
    modifiedModels: []
  }

  render() {
    if (this.props.models !== undefined) {
      console.log(this.props.models[0])
      let model: ModelObject;
      model = this.props.models[0].existing;
      return (
        <div>
          {this.props.models.map((obj: any) => {
              let checkObj: Check;
              checkObj = { model: obj.modified, checked: false }
              this.state.modifiedModels.push(checkObj)
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
                  <div className={"upload-button"}>
                    <Checks {...this.props}
                      linkedModel={obj.modified}
                      callback={(model: ModelObject) => {
                        var index = this.state.modifiedModels.findIndex((element: Check) => {
                          return element.model === model
                        })
                        this.state.modifiedModels[index].checked = !this.state.modifiedModels[index].checked
                      }}
                    />
                  </div>
                </div>
              )
            })}
            <h1></h1>
            <AnchorButton
              className={"upload-button"}
              large={true}
              intent="success"
              icon="import"
              text="Confirm Changes"
              onClick={() => {
                if (this.state.modifiedModels.length !== 0) {
                  let modified: Array<ModelObject>
                  modified = []
                  for (var i = 0; i < this.state.modifiedModels.length; i++) {
                    if (this.state.modifiedModels[i].checked)
                      modified.push(this.state.modifiedModels[i].model);
                  }
                  uploadModified(modified, this.props.token).then(res => {
                    console.log(res)
                  })
                } else {

                }
              }}
            />
        </div>
      )
    } else {
      return <p>No data</p>
    }
  }

}

async function uploadModified(modelList: Array<ModelObject>, token: string) {
  console.log(API_ROOT + "api/models/bulk-approve");
  console.log(token)
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return await axios
    .post(API_ROOT + "api/models/bulk-approve", {models: modelList}, headers)
    .then(res => {
      console.log(res.data)
      const data = res.data;
      return data;
    });
}

interface CheckboxProps {
  linkedModel: ModelObject,
  callback: Function
}

class Checks extends React.PureComponent<RouteComponentProps & CheckboxProps> {

  constructor(props: any) {
    super(props)
    this.handleChange = this.handleChange.bind(this)
  }

  render() {
    return (
      <label className={"bp3-control bp3-checkbox"}>
        <input type="checkbox" onChange={this.handleChange} />
        <span className={"bp3-control-indicator"}></span>
        Replace existing with modified?
      </label>
    )
  }

  private handleChange() {
    this.props.callback(this.props.linkedModel);
  }

}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
  };
};

export default withRouter(connect(mapStatetoProps)(Modifier));
