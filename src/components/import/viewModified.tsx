import { AnchorButton } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../api-config";
import "./import.scss";

interface ModifierProps {
  token: string,
  models?: Array<any>,
  callback: Function
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

export class Modifier extends React.PureComponent<RouteComponentProps & ModifierProps, ModifierState> {

  public state: ModifierState = {
    modifiedModels: []
  }

  render() {
    if (this.props.models !== undefined) {
      console.log(this.props.models[0]);
      let model: ModelObject;
      model = this.props.models[0].existing;
      const fields: ModelObject = {
        vendor: "Vendor",
        model_number: "Model #",
        height: "Height",
        display_color: "Display Color",
        num_ethernet_ports: "# Ethernet Ports",
        num_power_ports: "# Power Ports",
        cpu: "CPU",
        memory_gb: "Memory",
        storage: "Storage",
        comment: "Comments",
        id: ""
      }
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
                            return <th>{fields[item]}</th>
                          else
                            return <th> </th>
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Existing</td>
                        {Object.keys(model).map((key: string) => {
                          if (key !== "id")
                            return <td>{obj.existing[key]}</td>
                          else
                            return <td> </td>
                        })}
                      </tr>
                      <tr>
                        <td>Modified</td>
                        {Object.keys(model).map((key: string) => {
                          if (key !== "id")
                            return <td>{obj.modified[key]}</td>
                          else
                            return <td> </td>
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
                        let check: Array<Check>
                        check = this.state.modifiedModels;
                        check[index].checked = !check[index].checked
                        this.setState({
                          modifiedModels: check
                        })
                        // this.state.modifiedModels[index].checked = !this.state.modifiedModels[index].checked
                      }}
                    />
                  </div>
                </div>
              )
            })}
            <h1> </h1>
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
                    alert("Modifications were successful")
                    this.setState({
                      modifiedModels: []
                    })
                    this.props.callback()
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
    .post(API_ROOT + "api/models/bulk-approve", {approved_modifications: modelList}, headers)
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
