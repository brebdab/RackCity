import { Classes, AnchorButton, HTMLSelect } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
// import { InstanceObject, ModelObject } from "../utils";
import "./export.scss"

interface ExportProps {
  token: string
}

interface ExportState {
  selected: any,
  exportData: Array<any>
}

const pageSize = 100000000000;

export class BulkExport extends React.PureComponent<RouteComponentProps & ExportProps, ExportState> {

  public state: ExportState = {
    selected: "",
    exportData: []
  }

  render() {
    const options = [
      { value: "", label: "Select a value"},
      { value: "instances", label: "Instances" },
      { value: "models", label: "Models" }
    ]

    return (
      <div className={Classes.DARK}>
        <HTMLSelect
          options={options}
          large={true}
          onChange={(event: any) => {
            this.setState({exportData: []})
            event.persist();
            this.setState({ selected: event.currentTarget.value })
            getPages(this.state.selected, pageSize, this.props.token).then(res => {
              const numPages = res;
              for (let i = 1; i <= numPages; i++) {
                getData(this.state.selected, this.props.token, [], [], i).then(result => {
                  concatAsync(this.state.exportData, result).then((resu) => {
                    this.setState({exportData: resu})
                  })
                })
              }
            })
          }}
        />
        <AnchorButton
          className={"upload-button"}
          large={true}
          intent="success"
          icon="import"
          disabled={this.state.selected === null}
          text={"Export"}
          onClick={() => {
            var csvStr = "";
            const dat = this.state.exportData;
            if (this.state.selected === "models") {
              Object.keys(dat[0].models[0]).map((item: string) => {
                csvStr = csvStr + item +","
                return 0
              })
            } else {
              Object.keys(dat[0].instances[0]).map((item: string) => {
                csvStr = csvStr + item +","
                return 0
              })
            }
            csvStr = csvStr.substring(0, csvStr.length - 1)
            console.log(csvStr);
            csvStr = csvStr + "\n"
            if (this.state.selected === "models") {
              for (let i = 0; i < dat[0].models; i++) {
                console.log(dat[0].models[i])
              }
            } else {
              for (let i = 0; i < dat[0].instances; i++) {
                console.log(dat[0].instances[i])
              }
            }
          }}
        />
      </div>
    )
  };

}

async function concatAsync(data: Array<any>, newData: Array<any>) {
  return data.concat(newData)
}

async function getData(request: string, token: string, filters: Array<any>, sort: Array<any>, pageNum: number) {
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  }
  return await axios
    .post(API_ROOT + "api/" + request + "/get-many?page_size=" + pageSize +
        "&page=" + pageNum, [], headers)
    .then(res => {
      return res.data
    })
}

async function getPages(path: string, page_size: number, token: string) {
  const config = {
    headers: {
      Authorization: "Token " + token
    },

    params: {
      page_size
    }
  };
  return axios.get(API_ROOT + "api/" + path + "/pages", config).then(res => {
    return res.data.page_count;
  });
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(BulkExport));
