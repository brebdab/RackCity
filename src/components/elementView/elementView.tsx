import { Classes, Tab, Tabs } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import { API_ROOT } from "../../api-config";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import "./elementView.scss";

//export interface ElementViewProps {}

export class ElementView extends React.PureComponent<RouteComponentProps> {
  public render() {
    return (
      <Tabs
        className={Classes.DARK + " element-view"}
        animate={true}
        id="ElementViewer"
        key={"vertical"}
        renderActiveTabPanelOnly={false}
        vertical={true}
      >
        <Tab
          className="tab"
          id="instance"
          title="Instances"
          panel={
            <ElementTable element="instances" history={this.props.history} />
          }
        />
        <Tab
          className="tab"
          id="model"
          title="Models"
          panel={<ElementTable element="models" history={this.props.history} />}
        />
        <Tab
          className="tab"
          id="rack"
          title="Racks"
          panel={<ElementTable element="racks" history={this.props.history} />}
        />
        <Tabs.Expander />
      </Tabs>
    );
  }
}

async function getData(path: string) {
  console.log(API_ROOT + path);
  return await axios
    //.get("https://rack-city-dev.herokuapp.com/api/" + path)
    .get(API_ROOT + path)
    .then(res => {
      const data = res.data;
      const cols: Array<Array<string>> = data.map((item: any) => {
        return Object.keys(item);
      });
      return { cols, data };
    });
}

interface ElementTableState {
  columns: Array<string>;
  data: any;
}
interface ElementTableProps {
  element: string;
  history: any;
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

    this.setState({
      columns: resp.cols[0],

      data: resp.data
    });
  }
  public render() {
    return (
      <div className="ElementTable">
        <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered">
          <thead>
            <tr>
              {this.state.columns.map((col: string) => {
                return <th>{col}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {this.state.data.map((item: any) => {
              return (
                <tr
                  onClick={() =>
                    this.props.history.push(
                      "/" + this.props.element + "/test_rid"
                    )
                  }
                >
                  {this.state.columns.map((col: string) => {
                    return <td>{item[col]}</td>;
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

export default withRouter(ElementView);
