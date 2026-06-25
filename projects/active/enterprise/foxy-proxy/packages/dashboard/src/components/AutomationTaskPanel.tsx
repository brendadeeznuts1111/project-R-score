import React, { useState } from "react";
import { Play, Clock, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

import { LoopTaskHelper } from "../utils/duoplus/loop-task-helper";
import { DuoPlusAPI, type CreateLoopTaskResponse } from "../utils/duoplus";

interface AutomationTaskPanelProps {
  api: DuoPlusAPI;
  phoneId: string;
}

export const AutomationTaskPanel: React.FC<AutomationTaskPanelProps> = ({ api, phoneId }) => {
  const [taskName, setTaskName] = useState("New Automation Task");
  const templateId = "official-template-1";
  const [templateType, setTemplateType] = useState<1 | 2>(1);
  const [executeType, setExecuteType] = useState<"1" | "2" | "3" | "4">("1");
  const [gapTime, setGapTime] = useState<number>(30);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTask = async () => {
    if (!phoneId) {
      setStatus({ type: "error", message: "Please select a phone first" });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const helper = new LoopTaskHelper(api);
      let response: CreateLoopTaskResponse;

      const baseParams = {
        templateId,
        templateType,
        name: taskName,
        imageId: phoneId,
        startAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 16)
          .replace("T", " "),
        remark: "Created from Dashboard"
      };

      if (executeType === "1") {
        response = await helper.createIntervalTask({
          ...baseParams,
          gapTime
        });
      } else {
        response = await helper.createDailyTask({
          ...baseParams,
          executeTime: "09:00",
          mode: 1
        });
      }

      setStatus({
        type: "success",
        message: `Task created successfully! ID: ${response.data.id}`
      });
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error.message || "Failed to create task"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Play className="h-5 w-5 mr-2 text-blue-600" />
          Automation Tasks
        </h3>
        <span className="text-xs font-mono text-gray-500">API: /automation/addPlan</span>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="task-name" className="block text-sm font-medium text-gray-700">
              Task Name
            </label>
            <input
              id="task-name"
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="template-type" className="block text-sm font-medium text-gray-700">
              Template Type
            </label>
            <select
              id="template-type"
              value={templateType}
              onChange={(e) => setTemplateType(Number(e.target.value) as 1 | 2)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value={1}>Official Template</option>
              <option value={2}>Custom Template</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="block text-sm font-medium text-gray-700">Execute Type</span>
            <div className="mt-2 flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  checked={executeType === "1"}
                  onChange={() => setExecuteType("1")}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-600 flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> Interval
                </span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  checked={executeType === "2"}
                  onChange={() => setExecuteType("2")}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-600 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" /> Daily
                </span>
              </label>
            </div>
          </div>

          {executeType === "1" && (
            <div>
              <label htmlFor="gap-time" className="block text-sm font-medium text-gray-700">
                Gap Time (minutes)
              </label>
              <input
                id="gap-time"
                type="number"
                value={gapTime}
                onChange={(e) => setGapTime(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          )}
        </div>

        {status && (
          <div
            className={`p-3 rounded-md flex items-center ${
              status.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            <span className="text-sm">{status.message}</span>
          </div>
        )}

        <div className="pt-4">
          <button
            onClick={handleCreateTask}
            disabled={isSubmitting || !phoneId}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Loop Task"}
          </button>
        </div>
      </div>
    </div>
  );
};
