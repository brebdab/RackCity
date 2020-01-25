import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";

export interface ModelViewProps { rid: string };

interface ModelViewState {
  comment: any,
  cpu: any,
  display_color: any,
  height: any,
  memory_gb: any,
  model_id: any,
  model_number: any,
  num_ethernet_ports: any,
  num_power_ports: any,
  storage: any,
  vendor: any
}

async function getData(modelkey: string) {
  return await axios
    .get("https://rack-city-dev.herokuapp.com/api/models/" + modelkey)
    .then(res => {
      const data = res.data;
      return data;
    });
}

export class modelView extends React.PureComponent<RouteComponentProps, ModelViewState> {

  public state: ModelViewState = {
    comment: "",
    cpu: "",
    display_color: "",
    height: "",
    memory_gb: "",
    model_id: "",
    model_number: "",
    num_ethernet_ports: "",
    num_power_ports: "",
    storage: "",
    vendor: ""
  }

  async componentDidMount() {
    const resp = await getData("1");
    this.setState({
      comment: resp.comment,
      cpu: resp.cpu,
      display_color: resp.display_color,
      height: resp.height,
      memory_gb: resp.memory_gb,
      model_id: resp.model_id,
      model_number: resp.model_number,
      num_ethernet_ports: resp.num_ethernet_ports,
      num_power_ports: resp.num_power_ports,
      storage: resp.storage,
      vendor: resp.vendor
    })
  }

  public render() {
    // let params: any;
    // params = this.props.match.params
    return (
      <div className={Classes.DARK + " model-view"}>
        <h1>Model Specs</h1>
        <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered">
          <thead>
            <tr>
              <th>CPU</th>
              <th>Display Color</th>
              <th>Height</th>
              <th>Memory (GB)</th>
              <th>Model ID</th>
              <th>Model #</th>
              <th># Ethernet Ports</th>
              <th># Power Ports</th>
              <th>Storage</th>
              <th>Vendor</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{this.state.cpu}</td>
              <td>{this.state.display_color}</td>
              <td>{this.state.height}</td>
              <td>{this.state.memory_gb}</td>
              <td>{this.state.model_id}</td>
              <td>{this.state.model_number}</td>
              <td>{this.state.num_ethernet_ports}</td>
              <td>{this.state.num_power_ports}</td>
              <td>{this.state.storage}</td>
              <td>{this.state.vendor}</td>
              <td>{this.state.comment}</td>
            </tr>
          </tbody>
        </table>
        <h1>Instances of this model</h1>
        <div>
          <h1>TODO: Get instances</h1>
        </div>
        <h1>Options</h1>
      </div>
    )
  }

}

export default withRouter(modelView);
