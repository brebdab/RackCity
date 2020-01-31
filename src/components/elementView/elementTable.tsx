import { Icon, Spinner } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { IconNames } from "@blueprintjs/icons";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import {
  ElementObjectType,
  ElementType,
  isModelObject,
  isRackObject
} from "../utils";
import "./elementView.scss";
import DragDropList from "./dragDropList";
import { RackRangeFields } from "./rackSelectView";
import FilterSelectView from "./filterSelectView";
interface IElementTableState {
  items: Array<ElementObjectType>;
  sort_by: Array<ITableSort>;
  // sort_by_id: Array<ITableSort & IDragAndDrop>;
  filters: Array<IFilter>;
  sorted_cols: Array<string>;
  curr_page: number;
  total_pages: number;
}
export interface ITableSort {
  field: string;
  ascending: boolean;
  id: string;
}
const PAGE_SIZE = 10;

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
    page_num: number,
    page_size: number,
    body: any,
    token: string
  ): Promise<Array<ElementObjectType>>;
  getPages?(type: string, page_size: number, token: string): Promise<number>;
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
    sorted_cols: [],
    curr_page: 1,
    total_pages: 0
  };
  previousPage = () => {
    if (this.state.curr_page > 1 && this.props.getData) {
      const next_page = this.state.curr_page - 1;
      const { sort_by } = this.state;
      this.props
        .getData(
          this.props.type,
          next_page,
          PAGE_SIZE,
          { sort_by },
          this.props.token
        )
        .then(res => {
          this.setState({
            items: res,
            curr_page: next_page
          });
        });
    }
  };
  nextPage = () => {
    if (this.state.curr_page < this.state.total_pages && this.props.getData) {
      const next_page = this.state.curr_page + 1;
      const { sort_by } = this.state;
      this.props
        .getData(
          this.props.type,
          next_page,
          PAGE_SIZE,
          { sort_by },
          this.props.token
        )
        .then(res => {
          this.setState({
            items: res,
            curr_page: next_page
          });
        });
    }
  };
  renderFilterItem = (item: IFilter) => {
    return (
      <div className="header-text ">
        <span>
          <Icon
            className="icon"
            icon={IconNames.FILTER_LIST}
            iconSize={Icon.SIZE_STANDARD}
            // onClick={() => this.removeFilterItem(item.field)}
          />
        </span>
        <span>{`${item.field} 
        }`}</span>

        <span>
          <Icon
            className="icon"
            icon={IconNames.DELETE}
            iconSize={Icon.SIZE_STANDARD}
            // onClick={() => this.removeFilterItem(item.field)}
          />
        </span>
      </div>
    );
    // field: string;
    // filter_type: FilterTypes;
    // filter: TextFilter | NumericFilter | RackRangeFields;
  };

  renderSortItem = (item: ITableSort) => {
    return (
      <div className="header-text ">
        <span>{`${item.field} by ${
          item.ascending ? "ascending" : "descending"
        }`}</span>

        <span>
          <Icon
            className="icon"
            icon={IconNames.DELETE}
            iconSize={Icon.SIZE_STANDARD}
            onClick={() => this.removeSortItem(item.field)}
          />
        </span>
      </div>
    );
  };

  removeSortItem = (field: string) => {
    let sorts = this.state.sort_by;
    let sorted_cols = this.state.sorted_cols;
    const index = sorted_cols.indexOf(field, 0);
    if (index > -1) {
      sorted_cols.splice(index, 1);
    }
    sorts = sorts.filter(item => {
      return item.field !== field;
    });
    this.setState({
      sort_by: sorts,
      sorted_cols
      // sort_by_id: sorts_id
    });
    this.updateSortedData(sorts);
  };

  handleSort(field: string) {
    let ascending;
    let sorts = this.state.sort_by;

    const sorted_cols = this.state.sorted_cols;
    if (this.state.sorted_cols.includes(field)) {
      ascending = !this.state.sort_by.find(item => item.field === field)!
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
      sorted_cols.push(field);
    }
    // if (!this.state.sorted_cols.includes(field)) {

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
        this.state.curr_page,
        PAGE_SIZE,
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
      this.props
        .getData(
          this.props.type,
          this.state.curr_page,
          PAGE_SIZE,
          {},
          this.props.token
        )
        .then(res => {
          this.setState({
            items: res
          });
        })
        .catch(err => {
          console.log(err);
        });

      console.log("table mounted");
    }
    if (this.props.getPages) {
      this.props
        .getPages(this.props.type, PAGE_SIZE, this.props.token)
        .then(res => {
          this.setState({
            total_pages: res
          });
        });
    }
  }
  updateSortOrder = (items: Array<ITableSort>) => {
    console.log(items);
    this.setState({
      sort_by: items
    });
    this.updateSortedData(items);
  };
  getFieldNames = () => {
    let fields: Array<string> = [];
    if (this.state.items && this.state.items.length > 0) {
      Object.keys(this.state.items[0]).forEach((col: string) => {
        if (col === "model") {
          fields.push("model vendor");
          fields.push("model number");
        } else if (col !== "id") {
          fields.push(col);
        }
      });
    }
    return fields;
  };

  render() {
    console.log(this.state.items);
    console.log(!(this.state.items && this.state.items.length > 0));
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
        <FilterSelectView
          fields={this.getFieldNames()}
  
        />
        <DragDropList
          items={this.state.filters}
          renderItem={this.renderFilterItem}
          onChange={this.updateSortOrder}
        />
        <DragDropList
          items={this.state.sort_by}
          renderItem={this.renderSortItem}
          onChange={this.updateSortOrder}
        />
        {!(this.state.items && this.state.items.length > 0) ? (
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
            <div className="table-control">
              <span>
                <Icon
                  className="icon"
                  icon={IconNames.CARET_LEFT}
                  iconSize={Icon.SIZE_LARGE}
                  onClick={() => this.previousPage()}
                />
              </span>
              <span>
                page {this.state.curr_page} of {this.state.total_pages}
              </span>
              <span>
                <Icon
                  className="icon"
                  icon={IconNames.CARET_RIGHT}
                  iconSize={Icon.SIZE_LARGE}
                  onClick={() => this.nextPage()}
                />
              </span>
            </div>
            <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered table">
              <thead>
                <tr>
                  {Object.keys(this.state.items[0]).map((col: string) => {
                    if (col === "model") {
                      return [
                        <th className="header-cell">
                          <div className="header-text">
                            <span>model vendor</span>
                            <Icon
                              className="icon"
                              icon={IconNames.DOUBLE_CARET_VERTICAL}
                              iconSize={Icon.SIZE_STANDARD}
                              onClick={() => this.handleSort("model__vendor")}
                            />
                          </div>
                        </th>,
                        <th className="header-cell">
                          <div className="header-text">
                            <span>model number</span>
                            <Icon
                              className="icon"
                              icon={IconNames.DOUBLE_CARET_VERTICAL}
                              iconSize={Icon.SIZE_STANDARD}
                              onClick={() =>
                                this.handleSort("model__model_number")
                              }
                            />
                          </div>
                        </th>
                      ];
                    } else if (col !== "id") {
                      return (
                        <th className="header-cell">
                          <div className="header-text">
                            <span>{col}</span>
                            <Icon
                              className="icon"
                              icon={IconNames.DOUBLE_CARET_VERTICAL}
                              iconSize={Icon.SIZE_STANDARD}
                              onClick={() => this.handleSort(col)}
                            />
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
                          return [
                            <td>{value.vendor}</td>,
                            <td>{value.model_number}</td>
                          ];
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
