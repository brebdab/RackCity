import { AnchorButton } from "@blueprintjs/core";
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
    return (
      <p>Report</p>
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
      // console.log(res.data)
      return res.data
    })
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
  };
};

export default withRouter(connect(mapStatetoProps)(Report));
