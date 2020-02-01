import { /*Classes,*/ AnchorButton } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
// import axios from "axios";
import * as React from "react";
// import { API_ROOT } from "../../api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
// import { InstanceObject, ModelObject } from "../utils";
import Select from "react-select"

// const c2j = require('csvtojson')

interface ExportProps {
  token: string
}

interface ExportState {
  selected: any
}

export class BulkExport extends React.PureComponent<RouteComponentProps & ExportProps, ExportState> {

  public state: ExportState = {
    selected: null
  }

  render() {
    const options = [
      { value: "instances", label: "Instances" },
      { value: "models", label: "Models" }
    ]
    const selectedOption = null;

    return (
      <div>
        <Select
          options={options}
          value={selectedOption}
          onChange={(selectedOption: any) => { this.setState({ selected: selectedOption }); console.log(selectedOption) }}
        />
        <AnchorButton
          className={"upload-button"}
          large={true}
          intent="success"
          icon="import"
          disabled={this.state.selected === null}
          text={"Export " + ((this.state.selected === null) ? "" : this.state.selected.label)}
          onClick={() => {console.log(this.state.selected)}}
        />
      </div>
    )
  };

}


const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(BulkExport));
