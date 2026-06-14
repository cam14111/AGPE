import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { useStands } from "@/hooks/useStands";
import { useSlots } from "@/hooks/useSlots";
import { useSignups } from "@/hooks/useSignups";
import { downloadCsv } from "@/lib/csv-export";
import { formatTime } from "@/lib/date-utils";
export function Dashboard() {
  const { event } = useActiveEvent();
  const { stands } = useStands(event?.id);
  const { slots } = useSlots(stands.map((s) => s.id));
  const { signups } = useSignups(slots.map((s) => s.id));
  const full = slots.filter(
    (slot) =>
      signups.filter((s) => s.slot_id === slot.id).length >=
      slot.max_volunteers,
  ).length;
  const emptySlots = slots.filter(
    (slot) => !signups.some((s) => s.slot_id === slot.id),
  ).length;
  const emptyStands = stands.filter(
    (stand) =>
      !slots.some(
        (slot) =>
          slot.stand_id === stand.id &&
          signups.some((s) => s.slot_id === slot.id),
      ),
  ).length;
  function exportCsv(): void {
    downloadCsv(
      "inscriptions-kermesse.csv",
      signups.map((s) => {
        const slot = slots.find((sl) => sl.id === s.slot_id);
        const stand = stands.find((st) => st.id === slot?.stand_id);
        return {
          evenement: event?.name,
          stand: stand?.name,
          creneau: slot
            ? `${formatTime(slot.start_time)}-${formatTime(slot.end_time)}`
            : "",
          benevole: s.user_id,
          inscrit_le: s.created_at,
        };
      }),
    );
  }
  return (
    <>
      <PageHeader title="Admin" />
      <main className="mx-auto max-w-5xl space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi
            title="Bénévoles inscrits"
            value={new Set(signups.map((s) => s.user_id)).size}
          />
          <Kpi title="Créneaux complets" value={`${full}/${slots.length}`} />
          <Kpi title="Créneaux non pourvus" value={emptySlots} />
          <Kpi title="Stands incomplets" value={emptyStands} />
        </div>
        <Button variant="outline" onClick={exportCsv}>
          Exporter CSV
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Vue consolidée</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th>Stand</th>
                    <th>Créneau</th>
                    <th>Inscrits</th>
                    <th>Restantes</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => {
                    const count = signups.filter(
                      (s) => s.slot_id === slot.id,
                    ).length;
                    const stand = stands.find((s) => s.id === slot.stand_id);
                    return (
                      <tr key={slot.id} className="border-t">
                        <td>{stand?.name}</td>
                        <td>
                          {formatTime(slot.start_time)} →{" "}
                          {formatTime(slot.end_time)}
                        </td>
                        <td>{count}</td>
                        <td>{slot.max_volunteers - count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
function Kpi({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-slate-500">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
