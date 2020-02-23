import { Classes, Spinner, Card, Elevation, AnchorButton, Button, FormGroup, MenuItem } from "@blueprintjs/core";
import * as React from "react";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../utils/api-config";
import "./report.scss";
import { DatacenterSelect, filterDatacenter, renderDatacenterItem } from "../../forms/formUtils";
import { DatacenterObject } from "../../utils/utils";

interface ReportProps {
  token: string;
}

interface Allocation {
  alloc_pct: number;
}

interface ModelAlloc extends Allocation {
  model_number: string;
  vendor: string;
}

interface OwnerAlloc extends Allocation {
  owner: string;
}

interface VendorAlloc extends Allocation {
  vendor: string;
}

interface ReportState {
  freeRack: number;
  model_allocation: Array<ModelAlloc>;
  owner_allocation: Array<OwnerAlloc>;
  vendor_allocation: Array<VendorAlloc>;
  state_loaded: boolean;
  datacenter: string
}
var console: any = {};
console.log = function () { };

export class Report extends React.PureComponent<
  ReportProps & RouteComponentProps
  > {
  public state: ReportState = {
    freeRack: 0,
    model_allocation: [],
    owner_allocation: [],
    vendor_allocation: [],
    state_loaded: false,
    datacenter: ""
  };

  componentDidMount() {

  }

  render() {
    const modelFields = {
      vendor: "Vendor",
      model_number: "Model Number",
      allocation_percent: "Allocation %"
    };
    const ownerFields = {
      owner: "Owner",
      allocation_percent: "Allocation %"
    };
    const vendorFields = {
      vendor: "Vendor",
      allocation_percent: "Allocation %"
    };
    return (
      <div className={Classes.DARK}>
        <Card elevation={Elevation.TWO}>
          <FormGroup label="Datacenter" inline={true}>
            <DatacenterSelect
              popoverProps={{
                minimal: true,
                popoverClassName: "dropdown",
                usePortal: true
              }}
              items={this.props.datacenters!}
              onItemSelect={(datacenter: DatacenterObject) => {
                this.props.onDatacenterSelect!(datacenter);
              }}
              itemRenderer={renderDatacenterItem}
              itemPredicate={filterDatacenter}
              noResults={<MenuItem disabled={true} text="No results." />}
            >
              <Button
                rightIcon="caret-down"
                text={
                  this.props.currDatacenter && this.props.currDatacenter.name
                    ? this.props.currDatacenter.name
                    : "All datacenters"
                }
              />
            </DatacenterSelect>
          </FormGroup>
          <AnchorButton
            text={"Submit"}
            onClick={() => {
              if (this.state.datacenter === "global") {
                getGlobalReport(this.props.token).then(result => {
                  this.setState({
                    freeRack: result.free_rackspace_percent,
                    model_allocation: result.model_allocation,
                    owner_allocation: result.owner_allocation,
                    vendor_allocation: result.vendor_allocation,
                    state_loaded: true
                  })
                })
              } else if (this.state.datacenter.length > 0) {
                alert("datacenter")
              } else {
                alert("no datacenter selected")
              }
            }}
          />
        </Card>
        {this.state.state_loaded ? <Card elevation={Elevation.TWO}>
          <h2 className={"report-title"}>Datacenter Report</h2>
          <h4 className={"report-summary"}>Percent of unused rack space: {(this.state.freeRack * 100).toFixed(2)}%</h4>
          <h4 className={"report-summary"}>Allocation of used rack space:</h4>
          <div className={"row"}>
            <div className={"column-third-report"}>
              <h5>Used rack space by vendor:</h5>
            </div>
            <div className={"column-third-right-report"}>
              <h5>Used rack space by model:</h5>
            </div>
            <div className={"column-third-right-report"}>
              <h5>Used rack space by owner:</h5>
            </div>
          </div>
          <div className={"row"}>
            <div className={"column-third-report"}>
              <Tabular
                data={this.state.vendor_allocation}
                fields={vendorFields}
              />
            </div>
            <div className={"column-third-right-report"}>
              <Tabular
                data={this.state.model_allocation}
                fields={modelFields}
              />
            </div>
            <div className={"column-third-right-report"}>
              <Tabular
                data={this.state.owner_allocation}
                fields={ownerFields}
              />
            </div>
          </div>
        </Card> : null}
      </div>
    );
  }
}

interface TabProps {
  data: Array<Allocation>;
  fields: any;
}

class Tabular extends React.PureComponent<TabProps> {
  render() {
    return (
      <table
        className={
          "bp3-html-table bp3-interactive bp3-html-table-bordered bp3-html-table-striped"
        }
      >
        <thead>
          <tr>
            {Object.keys(this.props.data[0]).map((item: string) => {
              console.log(item);
              return <th>{this.props.fields[item]}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {this.props.data.map((entry: any) => {
            return (
              <tr>
                {Object.keys(entry).map((item: string) => {
                  if (item === "owner" && entry[item] === null)
                    entry[item] = "(No owner)";
                  if (item === "allocation_percent")
                    return <td>{(entry[item] * 100).toFixed(2)}</td>;
                  else return <td>{entry[item]}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
}

async function getGlobalReport(token: string) {
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return await axios.get(API_ROOT + "api/report/global", headers).then(res => {
    return res.data;
  });
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(Report));
