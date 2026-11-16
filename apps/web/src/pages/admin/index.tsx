import type { NextPageWithLayout } from "../_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import AdminCockpitView from "~/views/admin";

const AdminPage: NextPageWithLayout = () => {
  return (
    <>
      <AdminCockpitView />
      <Popup />
    </>
  );
};

AdminPage.getLayout = (page) => getDashboardLayout(page);

export default AdminPage;
