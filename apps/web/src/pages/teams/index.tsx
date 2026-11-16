import type { NextPageWithLayout } from "../_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import TeamsView from "~/views/teams";

const TeamsPage: NextPageWithLayout = () => {
  return (
    <>
      <TeamsView />
      <Popup />
    </>
  );
};

TeamsPage.getLayout = (page) => getDashboardLayout(page);

export default TeamsPage;
