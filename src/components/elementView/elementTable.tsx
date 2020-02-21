import {
  Alert,
  AnchorButton,
  HTMLSelect,
  Icon,
  Intent,
  IToastProps,
  Position,
  Toaster
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { IconNames } from "@blueprintjs/icons";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import FormPopup from "../../forms/formPopup";
import { FormTypes } from "../../forms/formUtils";
import {
  ElementObjectType,
  ElementType,
  getHeaders,
  isAssetObject,
  isModelObject,
  isRackObject,
  RackRangeFields,
  UserInfoObject,
  isUserObject,
  isDatacenterObject,
  DatacenterObject,
  isObject,
  SortFilterBody
} from "../../utils/utils";
import DragDropList from "./dragDropList";
import "./elementView.scss";
import FilterSelect from "./filterSelect";
import axios from "axios";
import { API_ROOT } from "../../utils/api-config";

import {
  ITableSort,
  PagingTypes,
  renderTextFilterItem,
  renderNumericFilterItem,
  renderRackRangeFilterItem,
  IFilter,
  FilterTypes,
  TextFilter,
  NumericFilter,
  deleteModel,
  deleteAsset,
  deleteDatacenter,
  modifyModel,
  modifyAsset,
  modifyDatacenter,
  ElementTableOpenAlert
} from "./elementUtils";

interface ElementTableState {
  items: Array<ElementObjectType>;
  sort_by: Array<ITableSort>;
  filters: Array<IFilter>;
  sorted_cols: Array<string>;
  curr_page: number;
  total_pages: number;
  page_type: PagingTypes;
  fields: Array<string>;
  isEditFormOpen: boolean;
  editFormValues: ElementObjectType;
  openAlert: ElementTableOpenAlert;
  selected_userid?: string;
}
// var console: any = {};
// console.log = function() {};

interface ElementTableProps {
  callback?: Function;
  type: ElementType;
  token: string;
  disableSorting?: boolean;
  disableFiltering?: boolean;
  currDatacenter?: DatacenterObject;
  getData?(
    type: string,
    page_num: number,
    page_type: PagingTypes,
    body: SortFilterBody,
    token: string
  ): Promise<Array<ElementObjectType>>;

  getFieldNames?(type: string, headers: any): Promise<Array<string>>;
  getPages?(
    type: string,
    page_size: PagingTypes,
    filters: Array<IFilter>,
    token: string
  ): Promise<number>;
  data?: Array<ElementObjectType>;
  shouldUpdateData?: boolean;
  isAdmin: boolean;
}

class ElementTable extends React.Component<
  ElementTableProps & RouteComponentProps,
  ElementTableState
  > {
  public state: ElementTableState = {
    page_type: 10,
    filters: [],
    sort_by: [],
    items: [],
    sorted_cols: [],
    curr_page: 1,
    total_pages: 0,
    fields: [],
    isEditFormOpen: false,
    editFormValues: {} as ElementObjectType,
    openAlert: ElementTableOpenAlert.NONE,
    selected_userid: undefined
  };

  //PAGING LOGIC
  resetPage = () => {
    console.log("setting currpage to 1");
    this.setState({
      curr_page: 1
    });
  };
  previousPage = () => {
    if (this.state.curr_page > 1 && this.props.getData) {
      const next_page = this.state.curr_page - 1;
      const { sort_by, filters } = this.state;
      this.props
        .getData(
          this.props.type,
          next_page,
          this.state.page_type,
          { sort_by, filters },
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
      const { filters } = this.state;
      this.props
        .getData(
          this.props.type,
          next_page,
          this.state.page_type,
          { sort_by, filters },
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
  componentWillReceiveProps(
    nextProps: ElementTableProps & RouteComponentProps
  ) {
    if (nextProps.currDatacenter !== this.props.currDatacenter) {
      this.updateTableData();
    }
  }

  handlePagingChange = (page: PagingTypes) => {
    this.setState({
      page_type: page
    });
    this.updateData(page);
  };
  // FILTERING AND SORTING DISPLAY

  getScrollIcon = (field: string) => {
    return this.props.disableSorting ? null : (
      <Icon
        className="icon"
        icon={IconNames.DOUBLE_CARET_VERTICAL}
        iconSize={Icon.SIZE_STANDARD}
        onClick={() => this.handleSort(field)}
      />
    );
  };
  renderFilterItem = (item: IFilter) => {
    let display;
    if (item.filter_type === FilterTypes.TEXT) {
      display = renderTextFilterItem(item.filter! as TextFilter);
    } else if (item.filter_type === FilterTypes.NUMERIC) {
      display = renderNumericFilterItem(item.filter! as NumericFilter);
    } else if (item.filter_type === FilterTypes.RACKRANGE) {
      display = renderRackRangeFilterItem(item.filter as RackRangeFields);
    }
    return (
      <div className="drag-drop-text">
        <span>
          <Icon
            className="icon"
            icon={IconNames.DRAG_HANDLE_VERTICAL}
            iconSize={Icon.SIZE_STANDARD}
          />
        </span>

        <span>{`${item.field} ${display}
      `}</span>

        <span>
          <Icon
            className="icon"
            icon={IconNames.DELETE}
            iconSize={Icon.SIZE_STANDARD}
            onClick={() => this.removeFilterItem(item)}
          />
        </span>
      </div>
    );
  };

  renderSortItem = (item: ITableSort) => {
    return (
      <div className="drag-drop-text ">
        <span>
          <Icon
            className="icon"
            icon={IconNames.DRAG_HANDLE_VERTICAL}
            iconSize={Icon.SIZE_STANDARD}
          />
        </span>
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

  // SORTING AND FILTERING LOGIC
  updateSortOrder = (items: Array<ITableSort>) => {
    this.setState({
      sort_by: items
    });
    this.updateSortData(items);
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
    });
    this.updateSortData(sorts);
  };
  removeFilterItem = (filter: IFilter) => {
    const filters = this.state.filters.filter(item => {
      return JSON.stringify(item) !== JSON.stringify(filter);
    });
    this.setState({
      filters
    });
    this.updateFilterData(filters);
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
      });
    } else {
      ascending = true;
      sorted_cols.push(field);
    }

    sorts.push({
      field,
      ascending,
      id: field
    });
    this.setState({
      sort_by: sorts,
      sorted_cols
    });
    this.updateSortData(sorts);
  }

  addFilter = (filter: IFilter) => {
    const filters = this.state.filters;
    filters.push(filter);
    console.log(filters);
    this.setState({
      filters
    });
    this.updateFilterData(filters);
  };

  updateFilterData = (items: Array<IFilter>) => {
    console.log(items);
    if (this.props.callback! !== undefined) this.props.callback(items);
    this.resetPage();
    if (this.props.getData) {
      this.props.getData!(
        this.props.type,
        1,
        this.state.page_type,
        { sort_by: this.state.sort_by, filters: items },
        this.props.token
      )
        .then(res => {
          this.setState({
            items: res
          });
          if (res.length === 0) {
            this.setState({
              curr_page: 0
            });
          }
        })
        .catch(err => {
          console.log("ERROR", err.response.data);
          this.addToast({
            message: err.response.data.failure_message,
            intent: Intent.DANGER
          });
        });
    }
    if (this.props.getPages) {
      this.props
        .getPages(
          this.props.type,
          this.state.page_type,
          items,
          this.props.token
        )
        .then(res => {
          this.setState({
            total_pages: res
          });
        });
    }
  };

  updateData = (page: PagingTypes) => {
    if (this.props.getData) {
      this.props.getData!(
        this.props.type,
        this.state.curr_page,
        page,
        { sort_by: this.state.sort_by, filters: this.state.filters },
        this.props.token
      )
        .then(res => {
          this.setState({
            items: res
          });
          console.log("DATA", res);
        })
        .catch(err => {
          this.addToast({
            message: err.response.data.failure_message,
            intent: Intent.DANGER
          });
        });
    }
    if (this.props.getPages) {
      this.props
        .getPages(this.props.type, page, this.state.filters, this.props.token)
        .then(res => {
          this.setState({
            total_pages: res
          });
        });
    }
  };
  updateSortData = (items: Array<ITableSort>) => {
    console.log("detected new sorts ", items);
    if (this.props.getData) {
      this.props.getData!(
        this.props.type,
        this.state.curr_page,
        this.state.page_type,
        { sort_by: items, filters: this.state.filters },
        this.props.token
      ).then(res => {
        this.setState({
          items: res
        });
      });
    }
  };

  //TOASTS
  private toaster: Toaster = {} as Toaster;
  private addToast = (toast: IToastProps) => {
    toast.timeout = 5000;
    this.toaster.show(toast);
  };
  private addSuccessToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.PRIMARY });
  };
  private addErrorToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.DANGER });
  };

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref)
  };

  componentDidUpdate() {
    if (this.props.shouldUpdateData && !this.props.data) {
      console.log("table updated");
      this.updateTableData();
    }
  }
  componentDidMount() {
    console.log("table mounted ");
    console.log(this.props.data);

    if (this.props.data) {
      console.log(this.props.data);
      this.setState({
        items: this.props.data
      });
      this.setFieldNames();
    } else {
      this.updateTableData();
    }
  }
  updateTableData = () => {
    if (this.props.getData) {
      this.props
        .getData(
          this.props.type,
          this.state.curr_page,
          this.state.page_type,
          { sort_by: this.state.sort_by, filters: this.state.filters },
          this.props.token
        )
        .then(res => {
          this.setState({
            items: res
          });
          console.log("DATA", res);
          this.setFieldNames();
        })
        .catch(err => {
          console.log(err);
        });
    }
    if (this.props.getPages) {
      this.props
        .getPages(
          this.props.type,
          this.state.page_type,
          this.state.filters,
          this.props.token
        )
        .then(res => {
          this.setState({
            total_pages: res
          });
        });
    }
  };

  setFieldNamesFromData = (items: Array<ElementObjectType>) => {
    let fields: Array<string> = [];
    Object.keys(items[0]).forEach((col: string) => {
      if (col === "model") {
        fields.push("model__vendor");
        fields.push("model__model_number");
      } else if (col === "rack") {
        fields.push("rack");
        fields.push("rack__datacenter__name");
      } else if (
        col !== "id" &&
        col !== "network_ports" &&
        col !== "comment" &&
        col !== "power_connections" &&
        col !== "mac_addresses" &&
        col !== "network_connections"
      ) {
        fields.push(col);
      }
    });
    this.setState({
      fields: fields
    });
    console.log("COLUMN NAMES", fields);
  };
  setFieldNames = () => {
    console.log("FIELD NAMES", this.state.items);

    if (this.state.items && this.state.items.length > 0) {
      this.setFieldNamesFromData(this.state.items);
    }
  };

  //EDIT AND DELETE LOGIC
  handleInlineButtonClick = (data: ElementObjectType) => {
    if (isAssetObject(data)) {
      this.setState({
        editFormValues: data
      });
    }
    if (isModelObject(data)) {
      this.setState({
        editFormValues: data
      });
    }
    if (isDatacenterObject(data)) {
      this.setState({
        editFormValues: data
      });
    }
  };
  //EDIT LOGIC
  handleEditFormClose = () => this.setState({ isEditFormOpen: false });
  getEditForm = () => {
    return (
      <FormPopup
        {...this.props}
        isOpen={this.state.isEditFormOpen}
        initialValues={this.state.editFormValues}
        type={FormTypes.MODIFY}
        elementName={this.props.type}
        handleClose={this.handleEditFormClose}
        submitForm={this.getSubmitFormFunction(FormTypes.MODIFY)}
      />
    );
  };

  successfulModification() {
    this.updateTableData();
    this.handleEditFormClose();
    this.addSuccessToast("Successfuly modified");
  }

  handleEditFormSubmit = (values: ElementObjectType, headers: any) => {
    if (isModelObject(values)) {
      modifyModel(values, headers).then(res => {
        this.successfulModification();
      });
    } else if (isAssetObject(values)) {
      modifyAsset(values, headers).then(res => {
        this.successfulModification();
      });
    } else if (isDatacenterObject(values)) {
      modifyDatacenter(values, headers).then(res => {
        this.successfulModification();
      });
    }
  };

  handleEditFormOpen = () => {
    this.setState({
      isEditFormOpen: true
    });
  };

  getSubmitFormFunction = (type: FormTypes) => {
    let submitForm;
    submitForm = this.handleEditFormSubmit;
    return submitForm;
  };
  handleEditButtonClick = (data: ElementObjectType) => {
    this.handleInlineButtonClick(data);
    this.handleEditFormOpen();
  };

  //DELETE LOGIC

  private handleDeleteOpen = () => this.setState({ openAlert: ElementTableOpenAlert.DELETE });
  private handleDeleteCancel = () => this.setState({ openAlert: ElementTableOpenAlert.NONE });

  private handleDelete = () => {
    console.log("DELETE");
    if (isModelObject(this.state.editFormValues)) {
      deleteModel(this.state.editFormValues, getHeaders(this.props.token))
        .then(res => {
          this.addErrorToast("Sucessfully deleted");
          this.handleDeleteCancel();
        })
        .catch(err => {
          this.addErrorToast(err.response.data.failure_message);
          this.handleDeleteCancel();
        });
    } else if (isAssetObject(this.state.editFormValues)) {
      deleteAsset(this.state.editFormValues, getHeaders(this.props.token)).then(
        res => {
          this.addErrorToast("Sucessfully deleted");
          this.handleDeleteCancel();
        }
      );
    } else if (isDatacenterObject(this.state.editFormValues)) {
      deleteDatacenter(
        this.state.editFormValues,
        getHeaders(this.props.token)
      ).then(res => {
        this.addErrorToast("Successfully deleted");
        this.handleDeleteCancel();
      });
    }
  };

  handleDeleteButtonClick = (data: ElementObjectType) => {
    this.handleInlineButtonClick(data);
    this.handleDeleteOpen();
  };

  handlePowerButtonClick = (data: ElementObjectType) => {
    alert("This power thingy is open");
  };

  //ADMIN BUTTON LOGIC
  //REVOKE ADMIN BUTTON LOGIC
  private handleRevokeAdminOpen = (userid: string) => this.setState({
    openAlert: ElementTableOpenAlert.REVOKE_ADMIN,
    selected_userid: userid
  });
  private handleRevokeAdminCancel = () => this.setState({
    openAlert: ElementTableOpenAlert.NONE,
    selected_userid: undefined
  });
  private handleRevokeAdmin = () => {
    this.setState({ openAlert: ElementTableOpenAlert.NONE })
    const headers = getHeaders(this.props.token)
    axios
      .post(API_ROOT + "api/users/revoke-admin", { "id": this.state.selected_userid }, headers)
      .then(res => {
        console.log(res.data)
        this.addToast({
          message: res.data.success_message,
          intent: Intent.PRIMARY
        });
        this.updateTableData()
      })
      .catch(err => {
        console.log(err);
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER
        });
      });
  };

  //GRANT ADMIN BUTTON LOGIC
  private handleGrantAdminOpen = (userid: string) => this.setState({
    openAlert: ElementTableOpenAlert.GRANT_ADMIN,
    selected_userid: userid
  });
  private handleGrantAdminCancel = () => this.setState({
    openAlert: ElementTableOpenAlert.NONE,
    selected_userid: undefined
  });
  private handleGrantAdmin = () => {
    this.setState({ openAlert: ElementTableOpenAlert.NONE })
    const headers = getHeaders(this.props.token)
    axios
      .post(API_ROOT + "api/users/grant-admin", { "id": this.state.selected_userid }, headers)
      .then(res => {
        console.log(res.data)
        this.addToast({
          message: res.data.success_message,
          intent: Intent.PRIMARY
        });
        this.updateTableData()
      })
      .catch(err => {
        console.log(err);
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER
        });
      });
  }

  renderAdminButton = (item: UserInfoObject) => {
    console.log(item.is_staff);
    if (item.is_staff) {
      return (
        <AnchorButton
          className="button-table"
          intent="danger"
          icon="user"
          minimal
          text="Remove Admin"
          onClick={() => this.handleRevokeAdminOpen(item.id)}
        />
      );
    } else {
      console.log("NOT AN ADMIN");
      return (
        <AnchorButton
          className="button-table"
          intent="primary"
          icon="user"
          minimal
          text="Add Admin "
          onClick={() => this.handleGrantAdminOpen(item.id)}
        />
      );
    }
  };

  render() {
    console.log(this.state.items);
    // console.log(!(this.state.items && this.state.items.length > 0));

    if (
      this.props.data &&
      this.props.data.length !== 0 &&
      this.state.items.length === 0
    ) {
      console.log("Setting items", this.props.data);
      this.setState({
        items: this.props.data
      });
      this.setFieldNamesFromData(this.props.data);
    }

    return (
      <div className="tab-panel">
        {this.getEditForm()}
        <Alert
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          intent="danger"
          isOpen={this.state.openAlert === ElementTableOpenAlert.DELETE}
          onCancel={this.handleDeleteCancel}
          onConfirm={this.handleDelete}
        >
          <p>Are you sure you want to delete?</p>
        </Alert>
        <Alert
          cancelButtonText="Cancel"
          confirmButtonText="Confirm"
          intent="danger"
          isOpen={this.state.openAlert === ElementTableOpenAlert.GRANT_ADMIN}
          onCancel={this.handleGrantAdminCancel}
          onConfirm={this.handleGrantAdmin}
        >
          <p>Are you sure you want to grant admin permission to this user?</p>
        </Alert>
        <Alert
          cancelButtonText="Cancel"
          confirmButtonText="Confirm"
          intent="danger"
          isOpen={this.state.openAlert === ElementTableOpenAlert.REVOKE_ADMIN}
          onCancel={this.handleRevokeAdminCancel}
          onConfirm={this.handleRevokeAdmin}
        >
          <p>Are you sure you want to revoke admin permission from this user?</p>
        </Alert>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
        <div className="filter-sort-panel">
          {this.props.disableFiltering
            ? null
            : [
              <div className="filter-select">
                <FilterSelect
                  handleAddFilter={this.addFilter}
                  fields={this.state.fields}
                />
              </div>,
              <div className="table-options">
                <p>Applied filters:</p>
                <DragDropList
                  items={this.state.filters}
                  renderItem={this.renderFilterItem}
                />
              </div>
            ]}
          {this.props.disableSorting ? null : (
            <div className="table-options">
              <p>Applied sorts:</p>
              <DragDropList
                items={this.state.sort_by}
                renderItem={this.renderSortItem}
                onChange={this.updateSortOrder}
              />
            </div>
          )}

          {this.props.getPages ? (
            <div className="table-control">
              <HTMLSelect
                onChange={(e: any) => this.handlePagingChange(e.target.value)}
              >
                {" "}
                <option> {PagingTypes.TEN}</option>
                <option>{PagingTypes.FIFTY}</option>
                <option>{PagingTypes.ALL}</option>
              </HTMLSelect>
              {this.state.page_type !== PagingTypes.ALL
                ? [
                  <span>
                    <Icon
                      className="icon"
                      icon={IconNames.CARET_LEFT}
                      iconSize={Icon.SIZE_LARGE}
                      onClick={() => this.previousPage()}
                    />
                  </span>,
                  <span>
                    page {this.state.curr_page} of {this.state.total_pages}
                  </span>,
                  <span>
                    <Icon
                      className="icon"
                      icon={IconNames.CARET_RIGHT}
                      iconSize={Icon.SIZE_LARGE}
                      onClick={() => this.nextPage()}
                    />
                  </span>
                ]
                : null}
            </div>
          ) : null}
        </div>
        <div className="table-wrapper">
          {this.state.fields.length === 0 ? null : (
            <table
              className={
                this.props.type !== ElementType.DATACENTER &&
                  this.props.type !== ElementType.USER
                  ? "bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered element-table"
                  : "bp3-html-table bp3-html-table-striped bp3-html-table-bordered element-table"
              }
            >
              <thead>
                <tr>
                  {this.state.fields.map((col: string) => {
                    if (col === "model") {
                      return [
                        <th className="header-cell">
                          <div className="header-text">
                            <span>model vendor</span>
                            {this.getScrollIcon("model__vendor")}
                          </div>
                        </th>,
                        <th className="header-cell">
                          <div className="header-text">
                            <span>model number</span>
                            {this.getScrollIcon("model__model_number")}
                          </div>
                        </th>
                      ];
                    } else {
                      return (
                        <th className="header-cell">
                          <div className="header-text">
                            <span>{col}</span>
                            {this.getScrollIcon(col)}
                          </div>
                        </th>
                      );
                    }
                  })}
                  <th></th>
                </tr>
              </thead>
              {this.state.items && this.state.items.length > 0 ? (
                <tbody>
                  {this.state.items.map((item: ElementObjectType) => {
                    if (isAssetObject(item)) {
                      console.log(item);
                    }
                    return (
                      <tr
                        onClick={
                          this.props.type === ElementType.DATACENTER ||
                            this.props.type === ElementType.USER
                            ? () => { }
                            : () => {
                              console.log("redirecting", item.id);
                              this.props.history.push(
                                "/" + this.props.type + "/" + item.id
                              );
                            }
                        }
                      >
                        {Object.entries(item).map(([col, value]) => {
                          if (isModelObject(value)) {
                            return [
                              <td>{value.vendor}</td>,
                              <td>{value.model_number}</td>
                            ];
                          } else if (isRackObject(value)) {
                            return [
                              <td>{value.row_letter + value.rack_num}</td>,
                              <td>{value.datacenter.name}</td>
                            ];
                          } else if (col === "display_color") {
                            console.log(value);
                            return (
                              <td
                                style={{
                                  backgroundColor: value
                                }}
                              ></td>
                            );
                          } else if (
                            col !== "id" &&
                            col !== "network_ports" &&
                            col !== "comment" &&
                            !isObject(value)
                          ) {
                            return <td>{value}</td>;
                          }

                          return null;
                        })}
                        <td>
                          {this.props.isAdmin &&
                            this.props.type !== ElementType.USER ? (
                              <div className="inline-buttons">
                                <AnchorButton
                                  className="button-table"
                                  intent="primary"
                                  icon="edit"
                                  minimal
                                  onClick={(event: any) => {
                                    this.handleEditButtonClick(item);
                                    event.stopPropagation();
                                  }}
                                />
                                <AnchorButton
                                  className="button-table"
                                  intent="danger"
                                  minimal
                                  icon="trash"
                                  onClick={(event: any) => {
                                    this.handleDeleteButtonClick(item);
                                    event.stopPropagation();
                                  }}
                                />
                                {this.props.isAdmin &&
                                  isAssetObject(item) &&
                                  item.rack.is_network_controlled ? (
                                    <AnchorButton
                                      className="button-table"
                                      intent="warning"
                                      minimal
                                      icon="offline"
                                      onClick={(event: any) => {
                                        this.handlePowerButtonClick(item);
                                        event.stopPropagation();
                                      }}
                                    />
                                  ) : null}
                              </div>
                            ) : null}{" "}
                          {/* TODO add logic for determining if isOwner for power button */}
                          {this.props.isAdmin && isUserObject(item) ? (
                            <div className="inline-buttons">
                              {this.renderAdminButton(item)}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ) : (
                  <h4 className="no-data-text">no {this.props.type} found </h4>
                )}
            </table>
          )}
        </div>
      </div>
    );
  }
}
const mapStateToProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};
export default connect(mapStateToProps)(withRouter(ElementTable));
