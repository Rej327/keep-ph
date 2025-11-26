"use client";

import {
  DataTable,
  DataTableColumn,
  DataTableSortStatus,
} from "mantine-datatable";
import { useState, useMemo } from "react";
import CustomLoader from "./CustomLoader";
import CustomNoData from "./CustomNoData";

type RecordType = Record<string, unknown>;

type ReusableTableProps<T extends RecordType> = {
  idAccessor?: keyof T | string;
  records: T[];
  columns: DataTableColumn<T>[];
  isRecordLoading?: boolean;
  pageSize?: number;
};

export function CustomDataTable<T extends RecordType>({
  idAccessor = "id",
  records,
  columns,
  isRecordLoading = false,
  pageSize = 10,
}: ReusableTableProps<T>) {
  const [page, setPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(pageSize);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<T>>({
    columnAccessor: "date_created" as keyof T,
    direction: "asc",
  });

  const handleSortStatusChange = (status: DataTableSortStatus<T>) => {
    setSortStatus(status);
    setPage(1);
  };

  const sortedRecords = useMemo(() => {
    if (!sortStatus.columnAccessor) return records;

    const sorted = [...records].sort((a, b) => {
      const accessor = sortStatus.columnAccessor as string;
      const aValue = a[accessor];
      const bValue = b[accessor];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return aValue.localeCompare(bValue);
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return aValue.getTime() - bValue.getTime();
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        const dateA = new Date(aValue);
        const dateB = new Date(bValue);
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return dateA.getTime() - dateB.getTime();
        }
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return aValue - bValue;
      }

      const aStr = String(aValue);
      const bStr = String(bValue);
      return aStr.localeCompare(bStr);
    });

    return sortStatus.direction === "desc" ? sorted.reverse() : sorted;
  }, [records, sortStatus]);

  if (!isRecordLoading && records.length === 0) {
    return (
      <CustomNoData
        description="There are no records to display at the moment."
        imageHeight={50}
        imageWidth={50}
        imageAlt="No records"
      />
    );
  }

  const startIndex = (page - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRecords = sortedRecords.slice(startIndex, endIndex);

  return (
    <DataTable
      idAccessor={idAccessor as string}
      withTableBorder={false}
      borderRadius="sm"
      highlightOnHover
      striped
      records={paginatedRecords}
      columns={columns}
      fetching={isRecordLoading}
      customLoader={<CustomLoader />}
      totalRecords={sortedRecords.length}
      recordsPerPage={recordsPerPage}
      page={page}
      onPageChange={setPage}
      recordsPerPageOptions={[5, 10, 20, 50]}
      onRecordsPerPageChange={setRecordsPerPage}
      paginationActiveBackgroundColor="#1966D1"
      sortStatus={sortStatus}
      onSortStatusChange={handleSortStatusChange}
    />
  );
}
