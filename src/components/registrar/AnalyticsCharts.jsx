"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MALE_FILL = "#1d4ed8";
const FEMALE_FILL = "#be185d";
const TRACK_COLORS = ["#800000", "#0f766e", "#1d4ed8", "#b45309"];
const DOC_PENDING = "#d97706";
const DOC_PROCESSING = "#2563eb";
const DOC_READY = "#059669";

function ChartShell({ title, description, children, className }) {
  return (
    <Card className={cn("gap-2 bg-white py-3 [--card-spacing:--spacing(3)]", className)}>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold text-[#3d1212]">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="text-[11px] leading-snug">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ message = "No data available yet." }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[#800000]/20 bg-[#800000]/[0.02] text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function tooltipStyle() {
  return {
    borderRadius: 8,
    border: "1px solid rgba(128,0,0,0.12)",
    boxShadow: "0 8px 24px rgba(61,18,18,0.08)",
    fontSize: 12,
  };
}

function OccupancyBar({ enrolled, capacity, occupancy }) {
  const pct = Math.min(100, Math.max(0, occupancy || 0));
  const tone =
    pct >= 95
      ? "bg-rose-600"
      : pct >= 80
        ? "bg-amber-500"
        : "bg-teal-600";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium tabular-nums text-[#3d1212]">
          {enrolled} / {capacity || "—"}
        </span>
        <span className="tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#800000]/10">
        <div
          className={cn("h-full rounded-full transition-all duration-500", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Analytical charts for registrar dashboard (Recharts).
 */
export function AnalyticsCharts({ charts }) {
  const enrollment = charts?.enrollmentByGrade || [];
  const tracks = (charts?.trackBreakdown || []).filter((t) => t.value > 0);
  const performance = charts?.performanceChart || [];
  const documents = charts?.documentByType || [];
  const buildings = charts?.capacityByBuilding || [];
  const sections = charts?.sectionOccupancy || [];

  const hasEnrollment = enrollment.some((r) => r.total > 0);
  const hasPerformance = performance.some((r) => r.count > 0);
  const hasDocuments = documents.some((r) => r.total > 0);

  return (
    <section className="space-y-2.5">
      <div>
        <h2 className="text-base font-semibold text-[#3d1212]">
          Analytical Charts & Visualizations
        </h2>
        <p className="text-xs text-muted-foreground">
          Enrollment balance, TLE tracks, academic bands, document pipeline, and
          classroom occupancy.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Chart 1 */}
        <ChartShell
          title="Enrollment by Grade Level & Gender"
          description="Side-by-side Male vs Female counts for Grades 7–12 (JHS + SHS)."
        >
          {hasEnrollment ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={enrollment}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#80000018" />
                  <XAxis
                    dataKey="grade"
                    tick={{ fontSize: 12, fill: "#5c2a2a" }}
                    axisLine={{ stroke: "#80000030" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={{ stroke: "#80000020" }}
                  />
                  <Tooltip contentStyle={tooltipStyle()} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="male"
                    name="Male"
                    fill={MALE_FILL}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="female"
                    name="Female"
                    fill={FEMALE_FILL}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No enrolled learners mapped to Grades 7–12 yet." />
          )}
        </ChartShell>

        {/* Chart 2 */}
        <ChartShell
          title="TLE / Track & Strand Specialization"
          description="Share of learners in ICT, FCS/Cookery, AFA, and Drafting."
        >
          {tracks.length > 0 ? (
            <div className="grid h-64 grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tracks}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {tracks.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={TRACK_COLORS[index % TRACK_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle()} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2 pr-1 text-sm">
                {tracks.map((entry, index) => (
                  <li
                    key={entry.name}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="inline-flex items-center gap-2 text-[#3d1212]">
                      <span
                        className="size-2.5 rounded-full"
                        style={{
                          background:
                            TRACK_COLORS[index % TRACK_COLORS.length],
                        }}
                      />
                      {entry.name}
                    </span>
                    <span className="font-semibold tabular-nums text-[#800000]">
                      {entry.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyChart message="No TLE track assignments found on sections." />
          )}
        </ChartShell>

        {/* Chart 3 */}
        <ChartShell
          title="General Grade Distribution"
          description="DepEd scale bands from quarterly / final transmuted grades."
        >
          {hasPerformance ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={performance}
                  margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#80000018" />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={58}
                    tick={{ fontSize: 10, fill: "#5c2a2a" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle()}
                    labelFormatter={(label, payload) => {
                      const range = payload?.[0]?.payload?.range;
                      return range ? `${label} (${range})` : label;
                    }}
                    formatter={(value) => [value, "Learners"]}
                  />
                  <Bar dataKey="count" name="Learners" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {performance.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No grade records available for performance bands." />
          )}
        </ChartShell>

        {/* Chart 4 */}
        <ChartShell
          title="Document Request Pipeline"
          description="Volume by document type across Pending, Processing, and Ready."
        >
          {hasDocuments ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={documents}
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#80000018"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="type"
                    width={88}
                    tick={{ fontSize: 12, fill: "#5c2a2a" }}
                  />
                  <Tooltip contentStyle={tooltipStyle()} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="pending"
                    name="Pending"
                    stackId="docs"
                    fill={DOC_PENDING}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="processing"
                    name="Processing"
                    stackId="docs"
                    fill={DOC_PROCESSING}
                  />
                  <Bar
                    dataKey="ready"
                    name="Ready for Pickup"
                    stackId="docs"
                    fill={DOC_READY}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No document requests in the pipeline yet." />
          )}
        </ChartShell>
      </div>

      {/* Chart 5 */}
      <ChartShell
        title="Classroom Capacity & Occupancy"
        description="Enrolled vs max capacity by building, plus highest-occupancy sections."
        className="xl:col-span-2"
      >
        {buildings.length === 0 && sections.length === 0 ? (
          <EmptyChart message="No section capacity or location data available." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-wide text-[#800000]/70 uppercase">
                By building
              </p>
              {buildings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add location labels on sections to group by building.
                </p>
              ) : (
                buildings.map((row) => (
                  <div key={row.building} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#3d1212]">
                        {row.building}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.sections} section{row.sections === 1 ? "" : "s"}
                      </p>
                    </div>
                    <OccupancyBar
                      enrolled={row.enrolled}
                      capacity={row.capacity}
                      occupancy={row.occupancy}
                    />
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-[#800000]/70 uppercase">
                Highest occupancy sections
              </p>
              <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#800000]/[0.04] text-xs tracking-wide text-[#800000]/80 uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Section</th>
                      <th className="px-3 py-2 font-semibold">Building</th>
                      <th className="px-3 py-2 font-semibold">Fill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-[#800000]/8"
                      >
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-[#3d1212]">
                            {row.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Grade {row.gradeLevel}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {row.building}
                        </td>
                        <td className="min-w-36 px-3 py-2.5">
                          <OccupancyBar
                            enrolled={row.enrolled}
                            capacity={row.capacity}
                            occupancy={row.occupancy}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </ChartShell>
    </section>
  );
}
