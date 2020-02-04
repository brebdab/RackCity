import { Classes, Spinner, Card, Elevation } from "@blueprintjs/core";
import * as React from "react";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../api-config";
import "./report.scss"

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
      allocation_percent: "Allocation %"
    }
    const ownerFields = {
      owner: "Owner",
      allocation_percent: "Allocation %"
    }
    const vendorFields = {
      vendor: "Vendor",
      allocation_percent: "Allocation %"
    }
    if (! this.state.state_loaded) {
      return <Spinner size={Spinner.SIZE_LARGE}/>
    } else {
      return (
        <div className={Classes.DARK}>
          <Card elevation={Elevation.TWO}>
            <div className={"row"}>
              <div className={"column-third-report"}>
                <h4>Model Allocation:</h4>
              </div>
              <div className={"column-third-right-report"}>
                <h4>Owner Allocation:</h4>
              </div>
              <div className={"column-third-right-report"}>
                <h4>Vendor Allocation:</h4>
              </div>
            </div>
            <div className={"row"}>
              <div className={"column-third-report"}>
                <Tabular data={this.state.model_allocation} fields={modelFields}/>
              </div>
              <div className={"column-third-right-report"}>
                <Tabular data={this.state.owner_allocation} fields={ownerFields}/>
              </div>
              <div className={"column-third-right-report"}>
                <Tabular data={this.state.vendor_allocation} fields={vendorFields}/>
              </div>
            </div>
            <h4 className={"column-third-left-report"}>Free Rack Space Pct: {this.state.freeRack * 100}%</h4>
          </Card>
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
        <table className={"bp3-html-table"}>
          <thead>
            <tr>
              {Object.keys(this.props.data[0]).map((item: string) => {
                console.log(item)
                return <th>{this.props.fields[item]}</th>
              })}
            </tr>
          </thead>
          <tbody>
            {this.props.data.map((entry: any) => {
              return (
                <tr>
                  {Object.keys(entry).map((item: string) => {
                    if (item === "allocation_percent")
                      return <td>{entry[item]*100}</td>
                    else
                      return <td>{entry[item]}</td>
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
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
