import { Classes, Spinner, Card, Elevation } from "@blueprintjs/core";
import * as React from "react";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../api-config";

interface ReportProps {
  token: string
}

interface Allocation {
  alloc_pct: number
}

interface ModelAlloc extends Allocation {
  model_number: string,
  vendor: string
}

interface OwnerAlloc extends Allocation {
  owner: string
}

interface VendorAlloc extends Allocation {
  vendor: string
}

interface ReportState {
  freeRack: number,
  model_allocation: Array<ModelAlloc>,
  owner_allocation: Array<OwnerAlloc>,
  vendor_allocation: Array<VendorAlloc>,
  state_loaded: boolean
}

export class Report extends React.PureComponent<ReportProps & RouteComponentProps> {

  public state: ReportState = {
    freeRack: 0,
    model_allocation: [],
    owner_allocation: [],
    vendor_allocation: [],
    state_loaded: false
  }

  render() {
    if (!this.state.state_loaded) {
        getReport(this.props.token).then(result => {
        this.setState({
          freeRack: result.free_rackspace_percent,
          model_allocation: result.model_allocation,
          owner_allocation: result.owner_allocation,
          vendor_allocation: result.vendor_allocation,
          state_loaded: true
        })
      })
    }
    console.log(this.state)
    const modelFields = {
      vendor: "Vendor",
      model_number: "Model Number",
      alloc_pct: "Allocation %"
    }
    const ownerFields = {
      owner: "Owner",
      alloc_pct: "Allocation %"
    }
    const vendorFields = {
      vendor: "Vendor",
      alloc_pct: "Allocation %"
    }
    if (! this.state.state_loaded) {
      return <Spinner size={Spinner.SIZE_LARGE}/>
    } else {
      return (
        <div className={Classes.DARK}>
          <h1>Free Rack Space Pct: {this.state.freeRack * 100}%</h1>
          <h1>Model Allocation:</h1>
          <Tabular data={this.state.model_allocation} fields={modelFields}/>
          <h1>Owner Allocation:</h1>
          <Tabular data={this.state.owner_allocation} fields={ownerFields}/>
          <h1>Vendor Allocation:</h1>
          <Tabular data={this.state.vendor_allocation} fields={vendorFields}/>
        </div>
      )
    }
  }
}

interface TabProps {
  data: Array<Allocation>,
  fields: any
}

class Tabular extends React.PureComponent<TabProps> {

  render() {
    return (
      <Card elevation={Elevation.TWO}>
        <table className={"bp3-html-table"}>
          <thead>
            <tr>
              {Object.keys(this.props.data[0]).map((item: string) => {
                return <th>{this.props.fields[item]}</th>
              })}
              <th>Allocation %</th>
            </tr>
          </thead>
          <tbody>
            {this.props.data.map((entry: any) => {
              return (
                <tr>
                  {Object.keys(entry).map((item: string) => {
                    return <td>{entry[item]}</td>
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    )
  }
}

async function getReport(token: string) {
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return await axios
    .get(API_ROOT + "api/report", headers)
    .then(res => {
      return res.data
    })
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
  };
};

export default withRouter(connect(mapStatetoProps)(Report));
