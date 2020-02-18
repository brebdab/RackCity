import {
  Alert,
  AnchorButton,
  Button,
  Callout,
  FormGroup,
  Intent,
  IToastProps,
  MenuItem,
  Position,
  Toaster
} from "@blueprintjs/core";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import FormPopup from "../../forms/formPopup";
import {
  DatacenterSelect,
  filterDatacenter,
  FormTypes,
  renderDatacenterItem
} from "../../forms/formUtils";
import { updateObject } from "../../store/utility";
import { API_ROOT } from "../../utils/api-config";
import {
  DatacenterObject,
  ElementType,
  getHeaders,
  RackRangeFields,
  RackResponseObject
} from "../../utils/utils";
import RackView from "./detailedView/rackView/rackView";
import { ALL_DATACENTERS } from "./elementTabContainer";
import RackSelectView from "./rackSelectView";

interface RackTabState {
  isOpen: boolean;
  isDeleteOpen: boolean;
  deleteRackInfo: RackRangeFields;
  headers: any;
  isConfirmationOpen: boolean;
  racks: Array<RackResponseObject>;
  loading: boolean;
}
interface RackTabProps {
  token: string;
  isAdmin: boolean;
  datacenters: Array<DatacenterObject>;
  currDatacenter: DatacenterObject;
  onDatacenterSelect(datacenter: DatacenterObject): void;
}
class RackTab extends React.Component<RackTabProps, RackTabState> {
  state = {
    isOpen: false,
    isDeleteOpen: false,
    deleteRackInfo: {} as RackRangeFields,
    headers: {},
    isConfirmationOpen: false,
    racks: [],
    loading: false
  };

  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }
  private toaster: Toaster = {} as Toaster;
  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref)
  };

  private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
  private handleDeleteOpen = () => this.setState({ isDeleteOpen: true });
  private handleClose = () => this.setState({ isOpen: false });

  private handleConfirmationCancel = () =>
    this.setState({ isConfirmationOpen: false });
  private handleConfirmationOpen = () =>
    this.setState({ isConfirmationOpen: true });
  viewRackForm = (rack: RackRangeFields, headers: any) => {
    this.setState({
      loading: true
    });
    let rack_datacenter = updateObject(rack, {
      datacenter: this.props.currDatacenter.id
    });

    return axios
      .post(API_ROOT + "api/racks/get", rack_datacenter, headers)
      .then(res => {
        this.setState({
          racks: res.data.racks,
          loading: false
        });
      })
      .catch(err => {
        this.setState({
          loading: false,
          racks: []
        });

        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER
        });
      });
  };
  private handleOpen = () => {
    this.setState({
      isOpen: true
    });
    console.log(this.state);
  };

  deleteRack = (rack: RackRangeFields, headers: any) => {
    this.setState({
      deleteRackInfo: rack,
      headers
    });
    this.handleConfirmationOpen();
  };
  actuallyDelete = () => {
    return axios
      .post(
        API_ROOT + "api/racks/delete",
        this.state.deleteRackInfo,
        this.state.headers
      )
      .then(res => {
        this.addToast({
          message: "Deleted rack(s) successfully",
          intent: Intent.PRIMARY
        });
        this.setState({ isDeleteOpen: false, isConfirmationOpen: false });
      })
      .catch(err => {
        console.log(err.response);
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER
        });
        this.setState({ isDeleteOpen: true, isConfirmationOpen: false });
      });
  };

  createRack = (rack: RackRangeFields, headers: any) => {
    return axios
      .post(API_ROOT + "api/racks/create", rack, headers)
      .then(res => {
        this.setState({ isOpen: false });
        this.addToast({
          message: "Created rack(s) successfully",
          intent: Intent.PRIMARY
        });
      });
  };

  getAllRacks = () => {
    this.setState({
      loading: true
    });
    axios
      .get(
        API_ROOT + "api/racks/get-all",
        // { sort_by: [], filters: [] },
        getHeaders(this.props.token)
      )
      .then(res => {
        this.setState({
          racks: res.data.racks,
          loading: false
        });
      })
      .catch(err => {
        this.setState({
          loading: false,
          racks: []
        });

        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER
        });
      });
  };

  render() {
    return (
      <div className="rack-tab">
        {/* <div className="do-not-print"> */}
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
        <div>
          <Callout>
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
          </Callout>
        </div>

        <FormPopup
          type={FormTypes.CREATE}
          elementName={ElementType.RACK}
          submitForm={this.createRack}
          isOpen={this.state.isOpen}
          handleClose={this.handleClose}
        />
        <FormPopup
          type={FormTypes.DELETE}
          elementName={ElementType.RACK}
          submitForm={this.deleteRack}
          isOpen={this.state.isDeleteOpen}
          handleClose={this.handleDeleteCancel}
        />
        <Alert
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          intent="danger"
          isOpen={this.state.isConfirmationOpen}
          onCancel={this.handleConfirmationCancel}
          onConfirm={this.actuallyDelete}
        >
          <p>Are you sure you want to delete?</p>
        </Alert>

        {this.props.currDatacenter &&
        this.props.currDatacenter.name !== ALL_DATACENTERS.name ? (
          <div>
            {this.props.isAdmin ? (
              <div className=" element-tab-buttons">
                <AnchorButton
                  className="add"
                  text={"Add Rack(s)"}
                  icon="add"
                  minimal
                  intent={Intent.PRIMARY}
                  onClick={this.handleOpen}
                />
                <AnchorButton
                  className="add "
                  text={"Delete Rack(s)"}
                  icon="trash"
                  minimal
                  intent={Intent.DANGER}
                  onClick={this.handleDeleteOpen}
                />
              </div>
            ) : null}
            <Button
              text="View All Rack(s)"
              onClick={(e: any) => this.getAllRacks()}
            />

            <RackSelectView submitForm={this.viewRackForm} />
          </div>
        ) : (
          <Callout intent={Intent.PRIMARY}>
            <h5>Please select a datacenter to view rack information</h5>
          </Callout>
        )}
        <RackView racks={this.state.racks} loading={this.state.loading} />
      </div>
      // </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};
export default connect(mapStatetoProps)(RackTab);
