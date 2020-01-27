import { Spinner } from "@blueprintjs/core";
import React from "react";
import axios from "axios";
import { API_ROOT } from "../../api-config";

interface ElementTableState {
  columns: Array<string>;
  data: any;
}

interface ElementTableProps {
  element: string;
  history: any;
}
async function getData(path: string) {
  console.log(API_ROOT + "api/" + path);
  return await axios
    //.get("https://rack-city-dev.herokuapp.com/api/" + path)
    .get(API_ROOT + "api/" + path)
    .then(res => {
      const data = res.data;
      const cols: Array<Array<string>> = data.map((item: any) => {
        return Object.keys(item);
      });
      return { cols, data };
    });
}
export class ElementTable extends React.Component<
  ElementTableProps,
  ElementTableState
> {
  public state: ElementTableState = {
    columns: [],
    data: []
  };
  async componentDidMount() {
    const resp = await getData(this.props.element);
    console.log(resp.cols);
    const cols = resp.cols.length === 0 ? [] : resp.cols[0];

    this.setState({
      columns: cols,

      data: resp.data
    });
  }

  render() {
    return this.state.columns.length === 0 ? (
      <div className="loading-container">
        <p className="center">No {this.props.element} data found </p>
        <p></p>
        <Spinner
          className="center"
          intent="primary"
          size={Spinner.SIZE_STANDARD}
        />
      </div>
    ) : (
      <div className="ElementTable">
        <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered">
          <thead>
            <tr>
              {this.state.columns.map((col: string) => {
                if (col !== "id") {
                  return <th>{col}</th>;
                }
                return null;
              })}
            </tr>
          </thead>
          <tbody>
            {this.state.data.map((item: any) => {
              return (
                <tr
                  onClick={() =>
                    this.props.history.push(
                      "/" + this.props.element + "/" + item["id"] // TODO replace test_rid with param */
                      // { rackname: "hello" } // pass additional props here
                    )
                  }
                >
                  {this.state.columns.map((col: string) => {
                    if (col !== "id") {
                      return <td>{item[col]}</td>;
                    }
                    return null;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
export default ElementTable;
