import { Classes, Tab, Tabs } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import "./elementView.scss";

export interface ElementViewProps {}

export class ElementView extends React.PureComponent<ElementViewProps> {
  public render() {
    return (
      <Tabs
        className={Classes.DARK}
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
          panel={<ElementTable element="instances" />}
        />
        <Tab
          className="tab"
          id="model"
          title="Models"
          panel={<ElementTable element="models" />}
        />
        <Tab
          className="tab"
          id="rack"
          title="Racks"
          panel={<ElementTable element="racks" />}
        />
        <Tabs.Expander />
        {/* <InputGroup className={Classes.FILL} type="text" placeholder="Search..." /> */}
      </Tabs>
    );
  }
}
interface ElementTableState {
  columns: Array<string>;
  data: any;
}
interface ElementTableProps {
  element: string;
}

async function getData(path: string) {
  return await axios
    .get("https://rack-city-dev.herokuapp.com/api/" + path)
    .then(res => {
      console.log("test");
      const data = res.data;
      const cols: Array<Array<string>> = data.map((item: any) => {
        console.log(Object.keys(item));
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

    console.log(resp.cols[0]);
    this.setState({
      columns: resp.cols[0],

      data: resp.data
    });
  }
  public render() {
    console.log("render");
    console.log(this.state.columns);

    return (
      <div className="ElementTable">
        <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered">
          <thead>
            {this.state.columns.map((col: string) => {
              console.log(col);
              return <th>{col}</th>;
            })}
          </thead>
          <tbody>
            {this.state.data.map((item: any) => {
              return (
                <tr>
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

export default ElementView;
