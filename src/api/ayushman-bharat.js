import { apiConnector, handleResponse } from "./core";
import { AYUSHMAN_BHARAT_API } from "./apis";

const {
  GET_ALL,
  GET_STATS,
  GET_BY_ID,
  ADD,
  UPDATE,
  DELETE,
} = AYUSHMAN_BHARAT_API;

const getAllRecords = async (params) => {
  let response = null;
  try {
    response = await apiConnector("GET", GET_ALL, null, null, params);
  } catch (error) {
    response = error;
  }
  return handleResponse(response);
};

const getStats = async () => {
  let response = null;
  try {
    response = await apiConnector("GET", GET_STATS);
  } catch (error) {
    response = error;
  }
  return handleResponse(response);
};

const getRecordById = async (id) => {
  let response = null;
  try {
    response = await apiConnector("GET", `${GET_BY_ID}/${id}`);
  } catch (error) {
    response = error;
  }
  return handleResponse(response);
};

const addRecord = async (data) => {
  let response = null;
  try {
    response = await apiConnector("POST", ADD, data);
  } catch (error) {
    response = error;
  }
  return handleResponse(response);
};

const updateRecord = async (id, data) => {
  let response = null;
  try {
    response = await apiConnector("PUT", `${UPDATE}/${id}`, data);
  } catch (error) {
    response = error;
  }
  return handleResponse(response);
};

const deleteRecord = async (id) => {
  let response = null;
  try {
    response = await apiConnector("DELETE", `${DELETE}/${id}`);
  } catch (error) {
    response = error;
  }
  return handleResponse(response);
};

const ayushmanBharat = {
  getAllRecords,
  getStats,
  getRecordById,
  addRecord,
  updateRecord,
  deleteRecord,
};

export default ayushmanBharat;
