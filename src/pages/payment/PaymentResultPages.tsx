import { CheckCircle2, XCircle } from "lucide-react";
import { Link, useParams } from "react-router";
import { Button, Card, CardContent } from "../../components/ui";

export const PaymentSuccessPage = () => {
  const { token = "" } = useParams();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
      <Card className="w-full text-center">
        <CardContent className="space-y-4 py-10">
          <CheckCircle2
            className="mx-auto h-14 w-14 text-success-500"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold text-slate-900">Payment successful</h1>
          <p className="text-slate-600">
            Your contribution has been recorded. The organiser can see updated
            progress immediately.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/">
              <Button>Back to organiser view</Button>
            </Link>
            <Link to={`/contribute/${token}`}>
              <Button variant="secondary">View contribution page</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const PaymentFailedPage = () => {
  const { token = "" } = useParams();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
      <Card className="w-full text-center">
        <CardContent className="space-y-4 py-10">
          <XCircle
            className="mx-auto h-14 w-14 text-danger-500"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold text-slate-900">Payment failed</h1>
          <p className="text-slate-600">
            Your payment could not be processed. The outstanding balance remains
            unchanged. You can retry using the same active link.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to={`/contribute/${token}/checkout`}>
              <Button>Retry payment</Button>
            </Link>
            <Link to={`/contribute/${token}`}>
              <Button variant="secondary">Back to review</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
