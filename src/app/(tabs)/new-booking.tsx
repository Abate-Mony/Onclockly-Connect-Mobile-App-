import { Redirect } from "expo-router"
import { useAuth } from "../../context/AuthContext"
import { canClient } from "../../utils/clientPermissions"

// Normal tab presses open the standalone screen without selecting this tab.
// This redirect also supports direct links and restored navigation state.
export default function NewBookingAction() {
  const { user } = useAuth()
  return <Redirect href={canClient(user?.clientRole, "booking:create") ? "/request-booking" : "/"} />
}
