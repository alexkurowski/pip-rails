class Pothole < ApplicationRecord
  acts_as_mappable lat_column_name: :latitude,
                   lng_column_name: :longitude

  def self.markers_in_bounds bounds
    Pothole
      .where(fixed_at: nil)
      .in_bounds(bounds)
      .map do |pothole|
        {
          'id': pothole.id,
          'lat': pothole.latitude,
          'lng': pothole.longitude,
          'category': pothole.category,
          'label': pothole.time_since_created
        }
      end
  end

  def time_since_created
    time = (Time.now - created_at).to_i.round
    days = time / 1.day
    hours = ( time - days * 1.day ) / 1.hour
    minutes = ( time - days * 1.day - hours * 1.hour ) / 1.minute

    "%02d:%02d:%02d" % [days, hours, minutes]
  end
end
