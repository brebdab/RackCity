import { Spinner } from "@blueprintjs/core";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import {
  ElementType,
  isModelObject,
  isRackObject,
  ElementObjectType
} from "../utils";
import "./elementView.scss";
import { FilterType } from "react-table";
import { RackRangeFields } from "./rackSelectView";
import { getElementData } from "./elementView";
import FilterList from "./filterList";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

interface IElementTableState {
  items: Array<ElementObjectType>;
  sort_by: Array<ITableSort>;
  // sort_by_id: Array<ITableSort & IDragAndDrop>;
  filters: Array<IFilter>;
  sorted_cols: Array<string>;
}
export interface ITableSort {
  field: string;
  ascending: boolean;
  id: string;
}

export enum FilterTypes {
  TEXT = "text",
  NUMERIC = "numeric",
  RACKRANGE = "rack_range"
}
export interface NumericFilter {
  min: number;
  max: number;
}
export interface TextFilter {
  value: string;
  match_type: string;
}
export interface IFilter {
  field: string;
  filter_type: FilterTypes;
  filter: TextFilter | NumericFilter | RackRangeFields;
}

interface IDragAndDrop {
  id: string;
}

interface IElementTableProps {
  type: ElementType;
  token: string;
  getData?(
    type: string,
    body: any,
    token: string
  ): Promise<Array<ElementObjectType>>;
  data?: Array<ElementObjectType>;
}

class ElementTable extends React.Component<
  IElementTableProps & RouteComponentProps,
  IElementTableState
> {
  public state: IElementTableState = {
    // sort_by_id: [],
    filters: [],
    sort_by: [],
    items: [],
    sorted_cols: []
  };

  renderSortItem = (item: ITableSort & IDragAndDrop) => {
    return `${item.field} ${item.ascending ? "Ascending" : "Descending"}`;
  };

  handleSort(field: string) {
    let ascending;
    let sorts = this.state.sort_by;
    if (this.state.sorted_cols.includes(field)) {
      ascending = !this.state.sort_by.find(item => item.field == field)!
        .ascending;
      sorts = sorts.filter(item => {
        return item.field !== field;
      });
      this.setState({
        sort_by: sorts
        // sort_by_id: sorts_id
      });
    } else {
      ascending = true;
    }
    // if (!this.state.sorted_cols.includes(field)) {
    const sorted_cols = this.state.sorted_cols;

    sorted_cols.push(field);
    sorts.push({
      field,
      ascending,
      id: field
    });
    this.setState({
      sort_by: sorts,
      sorted_cols
      // sort_by_id: sorts_id
    });
    this.updateSortedData(sorts);
    // } else {
    // }
  }

  updateSortedData = (sorts: Array<ITableSort>) => {
    const sorts_body = sorts.map(item => {
      const { field, ascending } = item;
      return { field, ascending };
    });
    console.log("detected new order", sorts_body);
    if (this.props.getData) {
      this.props.getData!(
        this.props.type,
        { sort_by: sorts_body },
        this.props.token
      ).then(res => {
        this.setState({
          items: res
        });
      });
    }
  };
  componentDidMount() {
    console.log(this.props.data);
    if (this.props.getData) {
      this.props.getData(this.props.type, {}, this.props.token).then(res => {
        this.setState({
          items: res
        });
      });
      console.log("table mounted");
    }
  }
  updateSortOrder = (items: Array<ITableSort>) => {
    console.log(items);
    this.setState({
      sort_by: items
    });
    this.updateSortedData(items);
  };

  render() {
    if (
      this.props.data &&
      this.props.data.length !== 0 &&
      this.state.items.length === 0
    ) {
      this.setState({
        items: this.props.data
      });
    }
    return (
      <div>
        <FilterList
          items={this.state.sort_by}
          renderItem={this.renderSortItem}
          onChange={this.updateSortOrder}
        />
        {this.state.items.length === 0 ? (
          <div className="loading-container">
            <Spinner
              className="center"
              intent="primary"
              size={Spinner.SIZE_STANDARD}
            />
            <h4>no {this.props.type}</h4>
          </div>
        ) : (
          <div className="ElementTable">
            <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered table">
              <thead>
                <tr>
                  {Object.keys(this.state.items[0]).map((col: string) => {
                    if (col !== "id") {
                      return (
                        <th className="header-cell">
                          <div className="header-text">
                            <span>{col}</span>
                            <span
                              onClick={() => this.handleSort(col)}
                              className="bp3-icon-large bp3-icon-layout-linear icon"
                            >
                              {" "}
                            </span>
                          </div>
                        </th>
                      );
                    }

                    return null;
                  })}
                </tr>
              </thead>
              <tbody>
                {this.state.items.map((item: ElementObjectType) => {
                  return (
                    <tr
                      onClick={() =>
                        this.props.history.push(
                          "/" + this.props.type + "/" + item.id
                        )
                      }
                    >
                      {Object.entries(item).map(([col, value]) => {
                        if (isModelObject(value)) {
                          return (
                            <td>{value.vendor + " " + value.model_number}</td>
                          );
                        } else if (isRackObject(value)) {
                          return (
                            <td>{value.row_letter + " " + value.rack_num}</td>
                          );
                        } else if (col !== "id") {
                          return <td>{value}</td>;
                        }
                        return null;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
}
const mapStateToProps = (state: any) => {
  return {
    token: state.token
  };
};
export default connect(mapStateToProps)(withRouter(ElementTable));
