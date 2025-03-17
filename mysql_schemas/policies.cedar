permit (
  principal,
  action == Action::"Select",
  resource
)
when
{
  principal.user_role == "manager" &&
  resource.data_classification == "sensitive"
};

permit (
  principal,
  action in
    [Action::"Select", Action::"Insert", Action::"Update", Action::"Delete"],
  resource
)
when
{
  principal.user_role == "employee" && resource.data_classification == "private"
};

permit (
  principal,
  action == Action::"Select",
  resource
)
when
{ principal.user_role == "intern" && resource.data_classification == "public" };

permit (
  principal,
  action == Action::"Select",
  resource
)
when
{
  principal.clearance_level == "top_secret" &&
  resource.data_classification == "sensitive"
};