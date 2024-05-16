import { ConnectionActionType } from "./connectionTypes";
import { Dispatch } from "redux";
import { Data, DataType, PeerConnection } from "../../helpers/peer";
import { message } from "antd";
import download from "js-file-download";

export const changeConnectionInput = (id: string) => ({
  type: ConnectionActionType.CONNECTION_INPUT_CHANGE,
  id,
});
export const setMessages = (text: string) => ({
  type: ConnectionActionType.CONNECTION_ADDMESSAGE,
  text,
});

export const setLoading = (loading: boolean) => ({
  type: ConnectionActionType.CONNECTION_CONNECT_LOADING,
  loading,
});
export const addConnectionList = (id: string) => ({
  type: ConnectionActionType.CONNECTION_LIST_ADD,
  id,
});

export const removeConnectionList = (id: string) => ({
  type: ConnectionActionType.CONNECTION_LIST_REMOVE,
  id,
});

export const selectItem = (id: string) => ({
  type: ConnectionActionType.CONNECTION_ITEM_SELECT,
  id,
});

export const connectPeer: (
  id: string
) => (dispatch: Dispatch) => Promise<void> =
  (id: string) => async (dispatch) => {
    dispatch(setLoading(true));
    try {
      await PeerConnection.connectPeer(id);

      PeerConnection.onConnectionDisconnected(id, () => {
        message.info("Connection closed: " + id);
        dispatch(removeConnectionList(id));
      });
      PeerConnection.onConnectionReceiveData(id, (file: string | Data) => {
        if (typeof file === "string") {
          dispatch(setMessages("other" + file));
        } else {
          message.info("Receiving file " + file.fileName + " from " + id);
          if (file.dataType === DataType.FILE) {
            download(
              file.file || "",
              file.fileName || "fileName",
              file.fileType
            );
          }
        }
      });
      dispatch(addConnectionList(id));
      dispatch(setLoading(false));
    } catch (err) {
      dispatch(setLoading(false));
      console.log(err);
    }
  };
